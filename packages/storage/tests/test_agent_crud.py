from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from storage.crud import agent
from storage.models import (
    ActionStatus,
    AgentMessage,
    MessageRole,
    RunStatus,
    User,
)


def _user(session: Session) -> User:
    user = User(email=f"{uuid4()}@x.io", name="Ada")
    session.add(user)
    session.commit()
    return user


def _turn(session, conversation, text="hi"):
    return agent.start_turn(
        session,
        conversation=conversation,
        content=text,
        model="m",
        prompt_version="1",
    )


def _tool_round(session, conversation, run, call_id="c1"):
    return agent.append_messages(
        session,
        conversation_id=conversation.id,
        run_id=run.id,
        messages=[
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": call_id,
                        "type": "function",
                        "function": {"name": "list_spend_items", "arguments": "{}"},
                    }
                ],
            },
            {"role": "tool", "tool_call_id": call_id, "content": '{"data": []}'},
            {"role": "assistant", "content": "Nothing yet."},
        ],
    )


def test_conversation_is_owner_scoped(session: Session) -> None:
    owner, other = _user(session), _user(session)
    conversation = agent.create_conversation(session, user_id=owner.id)
    assert agent.get_conversation(
        session, user_id=owner.id, conversation_id=conversation.id
    )
    assert (
        agent.get_conversation(
            session, user_id=other.id, conversation_id=conversation.id
        )
        is None
    )
    assert agent.list_conversations_page(
        session, user_id=other.id, skip=0, limit=10
    ) == ([], 0)


def test_start_turn_saves_message_run_and_title(session: Session) -> None:
    user = _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    doc = uuid4()
    message, run = agent.start_turn(
        session,
        conversation=conversation,
        content="  How much   on groceries\nlast month? " + "x" * 100,
        model="google/gemini",
        prompt_version="3",
        document_ids=[doc],
    )
    assert message.seq == 1
    assert message.role == MessageRole.USER
    assert message.run_id == run.id
    assert message.document_ids == [str(doc)]
    assert run.status == RunStatus.RUNNING
    assert run.user_id == user.id
    assert (run.model, run.prompt_version) == ("google/gemini", "3")
    assert conversation.title.startswith("How much on groceries last month? x")
    assert len(conversation.title) == 80

    _turn(session, conversation, "second question")
    assert conversation.title.startswith("How much")


def test_append_messages_round_trips_chat_shape(session: Session) -> None:
    user = _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    _, run = _turn(session, conversation)
    rows = _tool_round(session, conversation, run)

    assert [r.seq for r in rows] == [2, 3, 4]
    assert all(r.run_id == run.id for r in rows)
    replay = [
        agent.chat_message(m)
        for m in agent.list_messages(session, conversation_id=conversation.id)
    ]
    assert replay[0] == {"role": "user", "content": "hi"}
    assert replay[1]["tool_calls"][0]["function"]["name"] == "list_spend_items"
    assert replay[2] == {
        "role": "tool",
        "content": '{"data": []}',
        "tool_call_id": "c1",
    }
    assert replay[3] == {"role": "assistant", "content": "Nothing yet."}


def test_conversations_list_most_recent_first(session: Session) -> None:
    user = _user(session)
    first = agent.create_conversation(session, user_id=user.id)
    second = agent.create_conversation(session, user_id=user.id)
    _turn(session, first, "newer activity")

    rows, total = agent.list_conversations_page(
        session, user_id=user.id, skip=0, limit=10
    )
    assert total == 2
    assert [c.id for c in rows] == [first.id, second.id]


def test_history_cuts_at_a_user_turn(session: Session) -> None:
    user = _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    for i in range(3):
        _, run = _turn(session, conversation, f"q{i}")
        _tool_round(session, conversation, run, call_id=f"c{i}")

    rows = agent.history(session, conversation_id=conversation.id, turns=2)
    assert rows[0].role == MessageRole.USER
    assert rows[0].content == "q1"
    assert len(rows) == 8
    assert [r.seq for r in rows] == sorted(r.seq for r in rows)

    everything = agent.history(session, conversation_id=conversation.id, turns=50)
    assert len(everything) == 12


def test_seq_is_unique_per_conversation(session: Session) -> None:
    user = _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    _turn(session, conversation)
    session.add(
        AgentMessage(
            conversation_id=conversation.id, seq=1, role=MessageRole.USER, content="x"
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_finish_run_and_daily_count(session: Session) -> None:
    user, other = _user(session), _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    _, run = _turn(session, conversation)
    _turn(session, conversation)
    _turn(session, agent.create_conversation(session, user_id=other.id))

    finished = agent.finish_run(
        session,
        run,
        status=RunStatus.COMPLETED,
        steps=2,
        prompt_tokens=900,
        completion_tokens=120,
        cost_usd="0.00031",
    )
    assert finished.finished_at is not None
    assert (finished.steps, finished.cost_usd) == (2, "0.00031")

    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    assert agent.count_runs_since(session, user_id=user.id, since=today) == 2
    tomorrow = today + timedelta(days=1)
    assert agent.count_runs_since(session, user_id=user.id, since=tomorrow) == 0


def test_active_run_ignores_finished_and_stale_runs(session: Session) -> None:
    user = _user(session)
    conversation = agent.create_conversation(session, user_id=user.id)
    _, run = _turn(session, conversation)
    now = datetime.now(UTC)

    def active(after):
        return agent.active_run(
            session, conversation_id=conversation.id, started_after=after
        )

    assert active(now - timedelta(minutes=5)).id == run.id
    assert active(now + timedelta(minutes=1)) is None  # older than the cutoff
    agent.finish_run(
        session,
        run,
        status=RunStatus.COMPLETED,
        steps=1,
        prompt_tokens=1,
        completion_tokens=1,
        cost_usd=None,
    )
    assert active(now - timedelta(minutes=5)) is None
    assert [
        r.id for r in agent.list_runs(session, conversation_id=conversation.id)
    ] == [run.id]


# Pending actions


def _action(session, *, now=None):
    owner = _user(session)
    conversation = agent.create_conversation(session, user_id=owner.id)
    _, run = _turn(session, conversation)
    action = agent.create_action(
        session,
        run=run,
        tool_name="confirm_document",
        arguments={"document_id": "d1"},
        summary="Save Toit Brewpub · ₹1,710",
        now=now,
    )
    return owner, conversation, action


def test_action_starts_pending_and_expires_after_ttl(session: Session) -> None:
    now = datetime.now(UTC)
    owner, _, action = _action(session, now=now)
    assert action.status == ActionStatus.PENDING
    assert action.user_id == owner.id
    assert action.arguments == {"document_id": "d1"}
    assert action.expires_at - action.created_at == agent.ACTION_TTL


def test_action_is_owner_scoped(session: Session) -> None:
    owner, _, action = _action(session)
    other = _user(session)
    assert agent.get_action(session, user_id=owner.id, action_id=action.id)
    assert agent.get_action(session, user_id=other.id, action_id=action.id) is None
    assert agent.claim_action(session, user_id=other.id, action_id=action.id) is None
    assert agent.cancel_action(session, user_id=other.id, action_id=action.id) is None


def test_claim_wins_once(session: Session) -> None:
    owner, _, action = _action(session)
    first = agent.claim_action(session, user_id=owner.id, action_id=action.id)
    assert first is not None
    assert first.status == ActionStatus.CONFIRMED
    assert first.decided_at is not None
    # A double-tapped Confirm, or a cancel after it, changes nothing.
    assert agent.claim_action(session, user_id=owner.id, action_id=action.id) is None
    assert agent.cancel_action(session, user_id=owner.id, action_id=action.id) is None


def test_cancelled_action_cannot_be_claimed(session: Session) -> None:
    owner, _, action = _action(session)
    cancelled = agent.cancel_action(session, user_id=owner.id, action_id=action.id)
    assert cancelled is not None
    assert cancelled.status == ActionStatus.CANCELLED
    assert agent.claim_action(session, user_id=owner.id, action_id=action.id) is None


def test_expired_action_cannot_be_claimed(session: Session) -> None:
    created = datetime.now(UTC) - agent.ACTION_TTL - timedelta(seconds=1)
    owner, _, action = _action(session, now=created)
    assert agent.claim_action(session, user_id=owner.id, action_id=action.id) is None
    assert agent.expire_actions(session) == 1
    session.refresh(action)
    assert action.status == ActionStatus.EXPIRED
    assert agent.expire_actions(session) == 0


def test_record_result_and_failure(session: Session) -> None:
    owner, _, action = _action(session)
    claimed = agent.claim_action(session, user_id=owner.id, action_id=action.id)
    assert claimed is not None
    done = agent.record_action_result(session, claimed, result={"saved": 3})
    assert done.status == ActionStatus.CONFIRMED
    assert done.result == {"saved": 3}

    owner2, _, action2 = _action(session)
    claimed2 = agent.claim_action(session, user_id=owner2.id, action_id=action2.id)
    assert claimed2 is not None
    failed = agent.record_action_result(
        session, claimed2, result={"error": "gone"}, failed=True
    )
    assert failed.status == ActionStatus.FAILED


def test_list_actions_by_conversation_in_order(session: Session) -> None:
    _, conversation, first = _action(session)
    _, run = _turn(session, conversation, "again")
    second = agent.create_action(
        session,
        run=run,
        tool_name="confirm_document",
        arguments={"document_id": "d2"},
        summary="Save DMart",
        now=datetime.now(UTC) + timedelta(seconds=1),
    )
    _, other_conversation, _ = _action(session)
    listed = agent.list_actions(session, conversation_id=conversation.id)
    assert [a.id for a in listed] == [first.id, second.id]
    assert agent.list_actions(session, conversation_id=other_conversation.id) != listed
