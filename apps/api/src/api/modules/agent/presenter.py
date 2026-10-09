from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from storage.models import (
    AgentConversation,
    AgentMessage,
    AgentRun,
    MessageRole,
    RunStatus,
)

from api.modules.agent.schemas import (
    ConversationDetail,
    ConversationPublic,
    MessagePublic,
)

__all__ = ["to_detail", "to_public"]


def to_public(conversation: AgentConversation) -> ConversationPublic:
    return ConversationPublic(
        id=conversation.id,
        title=conversation.title,
        channel=conversation.channel,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def to_detail(
    conversation: AgentConversation,
    messages: Sequence[AgentMessage],
    runs: Sequence[AgentRun],
    *,
    stale_after: timedelta,
) -> ConversationDetail:
    """What the chat shows: the user's messages and text replies, no tool steps."""
    cutoff = datetime.now(UTC).replace(tzinfo=None) - stale_after
    status = {run.id: _status(run, cutoff) for run in runs}
    shown = [
        MessagePublic(
            id=m.id,
            role=m.role,
            content=m.content or "",
            created_at=m.created_at,
            status=status.get(m.run_id) if m.role == MessageRole.USER else None,
        )
        for m in messages
        if m.role == MessageRole.USER
        or (m.role == MessageRole.ASSISTANT and m.content and not m.tool_calls)
    ]
    return ConversationDetail(**to_public(conversation).model_dump(), messages=shown)


def _status(run: AgentRun, cutoff: datetime) -> str:
    started = run.started_at.replace(tzinfo=None)
    if run.status == RunStatus.RUNNING and started < cutoff:
        return RunStatus.FAILED  # the server stopped mid-reply
    return run.status
