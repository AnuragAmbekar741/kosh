"""The agent loop for one user turn: model ⇄ tools until a reply, as events."""

import logging
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

import ai
from sqlmodel import Session
from storage import database
from storage.crud import agent as crud
from storage.models import AgentRun, RunStatus

from api.modules.agent.prompt import system_prompt
from api.modules.agent.tools import ToolContext, run_tool, tool_schemas

__all__ = ["HISTORY_TURNS", "MAX_STEPS", "Event", "run_turn"]

logger = logging.getLogger(__name__)

MAX_STEPS = 6
HISTORY_TURNS = 10
STEP_LIMIT_REPLY = (
    "I couldn't finish working that out. Could you ask a narrower question, "
    "for example one month or one category?"
)
FAILED_REPLY = "Sorry, I couldn't answer that just now. Please try again."

Chat = Callable[..., ai.ChatTurn]


@dataclass(frozen=True)
class Event:
    """One thing the client should show: a tool chip, reply text, the end, or an error."""

    type: Literal["tool", "delta", "done", "error"]
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
) -> Iterator[Event]:
    """Answer the user message `start_turn` saved, yielding events as it goes.

    Every database step opens and closes its own session, so no connection is
    held while the model thinks. The run is always finished, even on failure.
    """
    chat = chat or ai.chat_with_tools
    system: ai.ChatMessage = {
        "role": "system",
        "content": system_prompt(today or datetime.now(UTC).date()),
    }
    schemas = tool_schemas()
    usage = _Usage()
    try:
        while usage.steps < MAX_STEPS:
            with Session(database.engine) as session:
                rows = crud.history(
                    session, conversation_id=conversation_id, turns=HISTORY_TURNS
                )
                messages = [system, *(crud.chat_message(row) for row in rows)]
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
