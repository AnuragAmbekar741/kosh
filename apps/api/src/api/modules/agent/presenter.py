import json
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from storage.models import (
    AgentConversation,
    AgentMessage,
    AgentRun,
    MessageRole,
    RunStatus,
)

from api.modules.agent.core.tools import AWAITING_USER
from api.modules.agent.schemas import (
    ActionPublic,
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
    actions = _actions_by_run(messages)
    last_reply = {
        m.run_id: m.id
        for m in messages
        if m.role == MessageRole.ASSISTANT and m.content and not m.tool_calls
    }
    shown = [
        MessagePublic(
            id=m.id,
            role=m.role,
            content=m.content or "",
            document_ids=[UUID(d) for d in m.document_ids or []],
            actions=actions.get(m.run_id, [])
            if last_reply.get(m.run_id) == m.id
            else [],
            created_at=m.created_at,
            status=status.get(m.run_id) if m.role == MessageRole.USER else None,
        )
        for m in messages
        if m.role == MessageRole.USER
        or (m.role == MessageRole.ASSISTANT and m.content and not m.tool_calls)
    ]
    return ConversationDetail(**to_public(conversation).model_dump(), messages=shown)


def _actions_by_run(messages: Sequence[AgentMessage]) -> dict[Any, list[ActionPublic]]:
    """Cards offered in each run, read back from its saved tool results.

    The tool result is the record of the offer, so nothing extra is stored and
    a card comes back after a reload. One card per proposal, first one kept.
    """
    found: dict[Any, list[ActionPublic]] = defaultdict(list)
    seen: set[tuple[Any, str, str]] = set()
    for m in messages:
        if m.role != MessageRole.TOOL or not m.content:
            continue
        try:
            result = json.loads(m.content)
        except ValueError:
            continue
        if not isinstance(result, dict) or result.get("status") != AWAITING_USER:
            continue
        action = ActionPublic.model_validate(result["action"])
        key = (m.run_id, action.tool, str(action.document_id))
        if key not in seen:
            seen.add(key)
            found[m.run_id].append(action)
    return found


def _status(run: AgentRun, cutoff: datetime) -> str:
    started = run.started_at.replace(tzinfo=None)
    if run.status == RunStatus.RUNNING and started < cutoff:
        return RunStatus.FAILED  # the server stopped mid-reply
    return run.status
