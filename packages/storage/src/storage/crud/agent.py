"""Agent conversations, messages, runs and pending actions.

Functions that take a `conversation_id` without a `user_id` trust the caller
to have loaded the conversation with `get_conversation` first.
"""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, update
from sqlmodel import Session, col, select

from storage.models.agent import (
    ActionStatus,
    AgentChannel,
    AgentConversation,
    AgentMessage,
    AgentPendingAction,
    AgentRun,
    MessageRole,
    RunStatus,
)
from storage.pagination import paginate

__all__ = [
    "ACTION_TTL",
    "active_run",
    "append_messages",
    "cancel_action",
    "chat_message",
    "claim_action",
    "count_runs_since",
    "create_action",
    "create_conversation",
    "expire_actions",
    "finish_run",
    "get_action",
    "get_conversation",
    "history",
    "list_actions",
    "list_conversations_page",
    "list_messages",
    "list_runs",
    "record_action_result",
    "start_turn",
]

ACTION_TTL = timedelta(minutes=15)

_TITLE_CHARS = 80


def create_conversation(
    session: Session, *, user_id: UUID, channel: str = AgentChannel.WEB
) -> AgentConversation:
    conversation = AgentConversation(user_id=user_id, channel=channel)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def get_conversation(
    session: Session, *, user_id: UUID, conversation_id: UUID
) -> AgentConversation | None:
    conversation = session.get(AgentConversation, conversation_id)
    if conversation is None or conversation.user_id != user_id:
        return None
    return conversation


def list_conversations_page(
    session: Session, *, user_id: UUID, skip: int, limit: int
) -> tuple[list[AgentConversation], int]:
    statement = (
        select(AgentConversation)
        .where(AgentConversation.user_id == user_id)
        .order_by(col(AgentConversation.updated_at).desc())
    )
    return paginate(session, statement, skip=skip, limit=limit)


def start_turn(
    session: Session,
    *,
    conversation: AgentConversation,
    content: str,
    model: str,
    prompt_version: str,
    document_ids: Sequence[UUID] | None = None,
) -> tuple[AgentMessage, AgentRun]:
    """Save the user's message and open a run for the reply, in one commit."""
    run = AgentRun(
        conversation_id=conversation.id,
        user_id=conversation.user_id,
        model=model,
        prompt_version=prompt_version,
    )
    session.add(run)
    session.flush()  # the message points at the run, so insert the run first
    message = AgentMessage(
        conversation_id=conversation.id,
        run_id=run.id,
        seq=_next_seq(session, conversation.id),
        role=MessageRole.USER,
        content=content,
        document_ids=[str(d) for d in document_ids] if document_ids else None,
    )
    if conversation.title is None:
        conversation.title = " ".join(content.split())[:_TITLE_CHARS] or None
    conversation.updated_at = message.created_at
    session.add_all([message, conversation])
    session.commit()
    session.refresh(message)
    session.refresh(run)
    return message, run


def append_messages(
    session: Session,
    *,
    conversation_id: UUID,
    run_id: UUID,
    messages: Sequence[dict[str, Any]],
) -> list[AgentMessage]:
    """Save chat-shaped dicts (`role`, `content`, `tool_calls`, `tool_call_id`) in order.

    One commit, so an assistant's tool calls are never saved without their results.
    """
    seq = _next_seq(session, conversation_id)
    rows = [
        AgentMessage(
            conversation_id=conversation_id,
            run_id=run_id,
            seq=seq + i,
            role=m["role"],
            content=m.get("content"),
            tool_calls=m.get("tool_calls"),
            tool_call_id=m.get("tool_call_id"),
        )
        for i, m in enumerate(messages)
    ]
    conversation = session.get(AgentConversation, conversation_id)
    if conversation is not None and rows:
        conversation.updated_at = rows[-1].created_at
        session.add(conversation)
    session.add_all(rows)
    session.commit()
    for row in rows:
        session.refresh(row)
    return rows


def history(
    session: Session, *, conversation_id: UUID, turns: int
) -> list[AgentMessage]:
    """Messages from the start of the last `turns` user messages, in order.

    Cutting by turns, not by message count, keeps every tool result next to
    the assistant message that asked for it.
    """
    start = session.exec(
        select(AgentMessage.seq)
        .where(
            AgentMessage.conversation_id == conversation_id,
            AgentMessage.role == MessageRole.USER,
        )
        .order_by(col(AgentMessage.seq).desc())
        .offset(turns - 1)
        .limit(1)
    ).first()
    statement = select(AgentMessage).where(
        AgentMessage.conversation_id == conversation_id
    )
    if start is not None:
        statement = statement.where(AgentMessage.seq >= start)
    return list(session.exec(statement.order_by(col(AgentMessage.seq))).all())


def active_run(
    session: Session, *, conversation_id: UUID, started_after: datetime
) -> AgentRun | None:
    """A reply still running in this conversation; older ones count as dead."""
    return session.exec(
        select(AgentRun).where(
            AgentRun.conversation_id == conversation_id,
            AgentRun.status == RunStatus.RUNNING,
            AgentRun.started_at > started_after,
        )
    ).first()


def list_runs(session: Session, *, conversation_id: UUID) -> list[AgentRun]:
    return list(
        session.exec(
            select(AgentRun).where(AgentRun.conversation_id == conversation_id)
        ).all()
    )


def list_messages(session: Session, *, conversation_id: UUID) -> list[AgentMessage]:
    return list(
        session.exec(
            select(AgentMessage)
            .where(AgentMessage.conversation_id == conversation_id)
            .order_by(col(AgentMessage.seq))
        ).all()
    )


def chat_message(message: AgentMessage) -> dict[str, Any]:
    """The row as an OpenAI chat message."""
    out: dict[str, Any] = {"role": message.role, "content": message.content}
    if message.tool_calls:
        out["tool_calls"] = message.tool_calls
    if message.tool_call_id:
        out["tool_call_id"] = message.tool_call_id
    return out


def finish_run(
    session: Session,
    run: AgentRun,
    *,
    status: RunStatus,
    steps: int,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: str | None,
    error: str | None = None,
) -> AgentRun:
    run.status = status
    run.steps = steps
    run.prompt_tokens = prompt_tokens
    run.completion_tokens = completion_tokens
    run.cost_usd = cost_usd
    run.error = error
    run.finished_at = datetime.now(UTC)
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def count_runs_since(session: Session, *, user_id: UUID, since: datetime) -> int:
    return session.exec(
        select(func.count())
        .select_from(AgentRun)
        .where(AgentRun.user_id == user_id, AgentRun.started_at >= since)
    ).one()


def _next_seq(session: Session, conversation_id: UUID) -> int:
    current = session.exec(
        select(func.max(AgentMessage.seq)).where(
            AgentMessage.conversation_id == conversation_id
        )
    ).one()
    return (current or 0) + 1


def create_action(
    session: Session,
    *,
    run: AgentRun,
    tool_name: str,
    arguments: dict[str, Any],
    summary: str,
    now: datetime | None = None,
) -> AgentPendingAction:
    """A write the model proposed, waiting for the user. Expires after `ACTION_TTL`."""
    now = now or datetime.now(UTC)
    action = AgentPendingAction(
        run_id=run.id,
        user_id=run.user_id,
        tool_name=tool_name,
        arguments=arguments,
        summary=summary,
        created_at=now,
        expires_at=now + ACTION_TTL,
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def get_action(
    session: Session, *, user_id: UUID, action_id: UUID
) -> AgentPendingAction | None:
    action = session.get(AgentPendingAction, action_id)
    if action is None or action.user_id != user_id:
        return None
    return action


def claim_action(
    session: Session, *, user_id: UUID, action_id: UUID, now: datetime | None = None
) -> AgentPendingAction | None:
    """Move a live pending action to `confirmed` in one UPDATE.

    Only one caller can win, so a double-tapped Confirm runs the action once.
    None when it is someone else's, already decided, or expired. The caller
    then runs the stored tool and saves the outcome with `record_action_result`.
    """
    return _decide(session, user_id, action_id, ActionStatus.CONFIRMED, now)


def cancel_action(
    session: Session, *, user_id: UUID, action_id: UUID, now: datetime | None = None
) -> AgentPendingAction | None:
    """Pending → cancelled; None when it can no longer be cancelled."""
    return _decide(session, user_id, action_id, ActionStatus.CANCELLED, now)


def record_action_result(
    session: Session,
    action: AgentPendingAction,
    *,
    result: dict[str, Any],
    failed: bool = False,
) -> AgentPendingAction:
    """Save what running a claimed action did; a failure marks it `failed`."""
    action.result = result
    if failed:
        action.status = ActionStatus.FAILED
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def expire_actions(session: Session, *, now: datetime | None = None) -> int:
    """Mark pending actions past `expires_at` as expired; returns how many."""
    now = now or datetime.now(UTC)
    result = session.exec(
        update(AgentPendingAction)
        .where(
            col(AgentPendingAction.status) == ActionStatus.PENDING,
            col(AgentPendingAction.expires_at) <= now,
        )
        .values(status=ActionStatus.EXPIRED, decided_at=now)
        .execution_options(synchronize_session=False)
    )
    session.commit()
    return result.rowcount


def list_actions(
    session: Session, *, conversation_id: UUID
) -> list[AgentPendingAction]:
    """A conversation's actions, oldest first, so cards survive a reload."""
    return list(
        session.exec(
            select(AgentPendingAction)
            .join(AgentRun, col(AgentRun.id) == col(AgentPendingAction.run_id))
            .where(AgentRun.conversation_id == conversation_id)
            .order_by(col(AgentPendingAction.created_at))
        ).all()
    )


def _decide(
    session: Session,
    user_id: UUID,
    action_id: UUID,
    status: ActionStatus,
    now: datetime | None,
) -> AgentPendingAction | None:
    now = now or datetime.now(UTC)
    result = session.exec(
        update(AgentPendingAction)
        .where(
            col(AgentPendingAction.id) == action_id,
            col(AgentPendingAction.user_id) == user_id,
            col(AgentPendingAction.status) == ActionStatus.PENDING,
            col(AgentPendingAction.expires_at) > now,
        )
        .values(status=status, decided_at=now)
        # Loaded rows are refreshed below; don't evaluate the WHERE in Python.
        .execution_options(synchronize_session=False)
    )
    session.commit()
    if result.rowcount != 1:
        return None
    action = session.get(AgentPendingAction, action_id)
    if action is not None:
        session.refresh(action)
    return action
