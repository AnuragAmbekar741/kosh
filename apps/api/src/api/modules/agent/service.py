"""Agent conversations over HTTP: every check before a turn, then the turn itself."""

import contextvars
import json
import queue
import threading
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from uuid import UUID

import ai
from ai.settings import get_settings as get_ai_settings
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from storage.crud import agent as crud
from storage.models import AgentConversation, AgentRun

from api.common.errors import (
    AgentBusyError,
    AgentDailyLimitError,
    AgentUnavailableError,
    NotFoundError,
)
from api.modules.agent.core import runtime
from api.modules.agent.core.prompts import PROMPT_VERSION
from api.modules.agent.settings import get_settings

__all__ = [
    "STALE_AFTER",
    "create_conversation",
    "get_owned",
    "list_conversations",
    "start_message",
    "stream",
]

# Longer than six 45-second model calls; a run still "running" after this died.
STALE_AFTER = timedelta(minutes=5)


def create_conversation(session: Session, user_id: UUID) -> AgentConversation:
    return crud.create_conversation(session, user_id=user_id)


def list_conversations(
    session: Session, user_id: UUID, *, skip: int, limit: int
) -> tuple[list[AgentConversation], int]:
    return crud.list_conversations_page(
        session, user_id=user_id, skip=skip, limit=limit
    )


def get_owned(
    session: Session, user_id: UUID, conversation_id: UUID
) -> AgentConversation:
    conversation = crud.get_conversation(
        session, user_id=user_id, conversation_id=conversation_id
    )
    if conversation is None:
        raise NotFoundError
    return conversation


def start_message(
    session: Session, user_id: UUID, conversation_id: UUID, text: str
) -> AgentRun:
    """Every reason to refuse, then save the message and open its run."""
    conversation = get_owned(session, user_id, conversation_id)
    now = datetime.now(UTC)
    if crud.active_run(
        session, conversation_id=conversation.id, started_after=now - STALE_AFTER
    ):
        raise AgentBusyError
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if (
        crud.count_runs_since(session, user_id=user_id, since=midnight)
        >= get_settings().agent_daily_runs
    ):
        raise AgentDailyLimitError
    if not get_ai_settings().openrouter_api_key:
        raise AgentUnavailableError
    try:
        _, run = crud.start_turn(
            session,
            conversation=conversation,
            content=text,
            model=ai.agent_model(),
            prompt_version=PROMPT_VERSION,
        )
    except IntegrityError:
        # Two sends raced for the same message number; the other one won.
        session.rollback()
        raise AgentBusyError from None
    return run


def stream(run: AgentRun) -> Iterator[str]:
    """Server-sent events for the turn.

    The turn runs in its own thread and finishes and saves even if the browser
    goes away; this generator only forwards its events.
    """
    # ponytail: this sync generator blocks a FastAPI pool thread (40, shared by
    # every route) for the whole reply, and nothing caps live replies. Fine for
    # now; past ~40 concurrent chats the whole API slows. Fix: async stream plus
    # a global cap. See docs/architecture/agent.md §13.
    events: queue.Queue[runtime.Event | None] = queue.Queue()
    kwargs = {
        "user_id": run.user_id,
        "conversation_id": run.conversation_id,
        "run_id": run.id,
        "model": run.model,
    }

    def work() -> None:
        try:
            for event in runtime.run_turn(**kwargs):
                events.put(event)
        finally:
            events.put(None)

    # copy_context keeps the request id on the turn's log lines.
    context = contextvars.copy_context()
    threading.Thread(
        target=context.run, args=(work,), name=f"agent-run-{run.id}", daemon=True
    ).start()
    while (event := events.get()) is not None:
        yield f"event: {event.type}\ndata: {json.dumps(event.data)}\n\n"
