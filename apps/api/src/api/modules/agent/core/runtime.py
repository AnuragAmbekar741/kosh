"""The agent loop for one user turn: model ⇄ tools until a reply, as events."""

import logging
import time
from collections.abc import Callable, Generator, Iterator, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

import ai
from sqlmodel import Session
from storage import database
from storage.crud import agent as crud
from storage.models import (
    AgentMessage,
    AgentRun,
    Document,
    DocumentStatus,
    RunStatus,
)

from api.modules.agent.core.prompts import system_prompt
from api.modules.agent.core.tools import ToolContext, run_tool, tool_schemas

__all__ = [
    "ATTACHMENT_WAIT_SECONDS",
    "HISTORY_TURNS",
    "MAX_STEPS",
    "STILL_READING_REPLY",
    "Event",
    "run_turn",
]

logger = logging.getLogger(__name__)

MAX_STEPS = 6
HISTORY_TURNS = 10
STEP_LIMIT_REPLY = (
    "I couldn't finish working that out. Could you ask a narrower question, "
    "for example one month or one category?"
)
FAILED_REPLY = "Sorry, I couldn't answer that just now. Please try again."
STILL_READING_REPLY = (
    "I'm still reading your bill. The bell will show it when it's ready; "
    "ask me about it again then."
)
# Extraction usually takes 10-15 seconds; past this the turn stops waiting.
ATTACHMENT_WAIT_SECONDS = 60.0
ATTACHMENT_POLL_SECONDS = 1.0
_READING = {DocumentStatus.UPLOADED, DocumentStatus.PROCESSING}

Chat = Callable[..., ai.ChatTurn]


@dataclass(frozen=True)
class Event:
    """One thing the client should show: a tool chip, reply text, the end, or an error."""

    type: Literal["document", "tool", "delta", "done", "error"]
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class _Usage:
    steps: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost: Decimal | None = None

    def add(self, turn: ai.ChatTurn) -> None:
        self.steps += 1
        self.prompt_tokens += turn.prompt_tokens
        self.completion_tokens += turn.completion_tokens
        if turn.cost_usd is not None:
            self.cost = (self.cost or Decimal(0)) + Decimal(turn.cost_usd)


def run_turn(
    *,
    user_id: UUID,
    conversation_id: UUID,
    run_id: UUID,
    model: str,
    chat: Chat | None = None,
    today: date | None = None,
    document_ids: Sequence[UUID] = (),
    sleep: Callable[[float], None] = time.sleep,
    clock: Callable[[], float] = time.monotonic,
) -> Iterator[Event]:
    """Answer the user message `start_turn` saved, yielding events as it goes.

    Bills attached to the message are waited for first, so the model reads
    their drafts instead of a half-extracted bill. Every database step opens
    and closes its own session, so no connection is held while the model
    thinks or the worker extracts. The run is always finished, even on failure.
    """
    chat = chat or ai.chat_with_tools
    system: ai.ChatMessage = {
        "role": "system",
        "content": system_prompt(today or datetime.now(UTC).date()),
    }
    schemas = tool_schemas()
    usage = _Usage()
    try:
        if document_ids:
            ready = yield from _wait_for_documents(document_ids, sleep, clock)
            if not ready:
                yield from _reply(
                    run_id,
                    conversation_id,
                    {"role": "assistant", "content": STILL_READING_REPLY},
                    usage,
                )
                return
        while usage.steps < MAX_STEPS:
            with Session(database.engine) as session:
                rows = crud.history(
                    session, conversation_id=conversation_id, turns=HISTORY_TURNS
                )
                messages = [system, *(_model_message(row) for row in rows)]
            turn = chat(messages, schemas, model=model)
            usage.add(turn)
            if not turn.tool_calls:
                yield from _reply(run_id, conversation_id, turn.message, usage)
                return
            for call in turn.tool_calls:
                yield Event("tool", {"name": call["function"]["name"]})
            with Session(database.engine) as session:
                ctx = ToolContext(session=session, user_id=user_id)
                results = [
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": run_tool(
                            ctx, call["function"]["name"], call["function"]["arguments"]
                        ),
                    }
                    for call in turn.tool_calls
                ]
                crud.append_messages(
                    session,
                    conversation_id=conversation_id,
                    run_id=run_id,
                    messages=[turn.message, *results],
                )
        yield from _reply(
            run_id,
            conversation_id,
            {"role": "assistant", "content": STEP_LIMIT_REPLY},
            usage,
            status=RunStatus.FAILED,
            error="step limit",
        )
    except ai.ChatError as exc:
        _finish(run_id, usage, RunStatus.FAILED, error=str(exc)[:500])
        yield Event("error", {"message": FAILED_REPLY, "run_id": str(run_id)})
    except Exception as exc:
        logger.exception("agent turn crashed", extra={"run_id": str(run_id)})
        _finish(run_id, usage, RunStatus.FAILED, error=type(exc).__name__)
        yield Event("error", {"message": FAILED_REPLY, "run_id": str(run_id)})


def _model_message(row: AgentMessage) -> ai.ChatMessage:
    """The saved row as the model sees it; attached bills are named by id."""
    message = crud.chat_message(row)
    if row.document_ids:
        ids = ", ".join(row.document_ids)
        note = f"[Attached bills: {ids}]"
        message["content"] = f"{row.content}\n\n{note}" if row.content else note
    return message


def _wait_for_documents(
    document_ids: Sequence[UUID],
    sleep: Callable[[float], None],
    clock: Callable[[], float],
) -> Generator[Event, None, bool]:
    """Poll the attached bills until none is being read; a `document` event per change.

    Returns False if any is still being read after `ATTACHMENT_WAIT_SECONDS`.
    The service already checked that every id belongs to the user.
    """
    deadline = clock() + ATTACHMENT_WAIT_SECONDS
    seen: dict[UUID, str] = {}
    while True:
        with Session(database.engine) as session:
            statuses = {
                document_id: document.status
                for document_id in document_ids
                if (document := session.get(Document, document_id)) is not None
            }
        for document_id, status in statuses.items():
            if seen.get(document_id) != status:
                seen[document_id] = status
                yield Event("document", {"id": str(document_id), "status": status})
        if not any(status in _READING for status in statuses.values()):
            return True
        if clock() >= deadline:
            return False
        sleep(ATTACHMENT_POLL_SECONDS)


def _reply(
    run_id: UUID,
    conversation_id: UUID,
    message: ai.ChatMessage,
    usage: _Usage,
    *,
    status: RunStatus = RunStatus.COMPLETED,
    error: str | None = None,
) -> Iterator[Event]:
    with Session(database.engine) as session:
        (saved,) = crud.append_messages(
            session,
            conversation_id=conversation_id,
            run_id=run_id,
            messages=[message],
        )
        message_id = saved.id
    _finish(run_id, usage, status, error=error)
    yield Event("delta", {"text": message["content"] or ""})
    yield Event("done", {"message_id": str(message_id), "run_id": str(run_id)})


def _finish(
    run_id: UUID, usage: _Usage, status: RunStatus, *, error: str | None = None
) -> None:
    with Session(database.engine) as session:
        run = session.get(AgentRun, run_id)
        if run is None:
            return
        crud.finish_run(
            session,
            run,
            status=status,
            steps=usage.steps,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            cost_usd=None if usage.cost is None else str(usage.cost),
            error=error,
        )
