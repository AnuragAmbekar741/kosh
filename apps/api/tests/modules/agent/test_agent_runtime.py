import json
from datetime import date
from decimal import Decimal
from uuid import uuid4

import ai
import pytest
from api.modules.agent import runtime, tools
from api.modules.agent.runtime import MAX_STEPS, run_turn
from sqlmodel import Session, select
from storage import database
from storage.crud import agent as crud
from storage.crud.spend import create_spend_item
from storage.models import (
    AgentMessage,
    AgentRun,
    RunStatus,
    SpendSource,
    SpendStatus,
    User,
)

TODAY = date(2026, 10, 7)


def _turn(*, text=None, calls=(), cost="0.001") -> ai.ChatTurn:
    message: ai.ChatMessage = {"role": "assistant", "content": text}
    if calls:
        message["tool_calls"] = [
            {
                "id": f"call_{i}",
                "type": "function",
                "function": {"name": name, "arguments": json.dumps(args)},
            }
            for i, (name, args) in enumerate(calls)
        ]
    return ai.ChatTurn(
        message=message,
        model="fake/model",
        provider="fake",
        prompt_tokens=100,
        completion_tokens=20,
        cost_usd=cost,
    )


class FakeChat:
    """Answers with scripted turns; fails if a DB connection is open during a call."""

    def __init__(self, *turns: ai.ChatTurn | Exception) -> None:
        self.turns = list(turns)
        self.calls: list[list[dict]] = []

    def __call__(self, messages, schemas, *, model):
        assert database.engine.pool.checkedout() == 0, "DB connection held"
        assert model == "fake/model"
        assert {s["function"]["name"] for s in schemas} == set(tools.TOOLS)
        self.calls.append(list(messages))
        turn = self.turns.pop(0) if len(self.turns) > 1 else self.turns[0]
        if isinstance(turn, Exception):
            raise turn
        return turn


@pytest.fixture
def turn(db_engine):
    """Ada with one grocery line asks a question; returns the ids run_turn needs."""
    with Session(db_engine) as session:
        user = User(email=f"{uuid4()}@x.io", name="Ada")
        session.add(user)
        session.commit()
        create_spend_item(
            session,
            user_id=user.id,
            merchant="DMart",
            amount=Decimal("1240.00"),
            currency="USD",
            spent_at=date(2026, 9, 12),
            category="Groceries",
            source=SpendSource.MANUAL,
            status=SpendStatus.CONFIRMED,
        )
        conversation = crud.create_conversation(session, user_id=user.id)
        _, run = crud.start_turn(
            session,
            conversation=conversation,
            content="How much on groceries last month?",
            model="fake/model",
            prompt_version="1",
        )
        return {
            "user_id": user.id,
            "conversation_id": conversation.id,
            "run_id": run.id,
            "model": "fake/model",
            "today": TODAY,
        }


def _run(turn, chat) -> list[runtime.Event]:
    return list(run_turn(chat=chat, **turn))


def _saved(db_engine, turn) -> tuple[list[AgentMessage], AgentRun]:
    with Session(db_engine) as session:
        messages = list(
            session.exec(
                select(AgentMessage)
                .where(AgentMessage.conversation_id == turn["conversation_id"])
                .order_by(AgentMessage.seq)
            ).all()
        )
        return messages, session.get(AgentRun, turn["run_id"])


def test_tool_round_trip(db_engine, turn) -> None:
    chat = FakeChat(
        _turn(calls=[("get_spending_summary", {"categories": ["Groceries"]})]),
        _turn(text="You spent $1,240.00 on groceries.", cost="0.002"),
    )
    events = _run(turn, chat)

    assert [e.type for e in events] == ["tool", "delta", "done"]
    assert events[0].data == {"name": "get_spending_summary"}
    assert events[1].data == {"text": "You spent $1,240.00 on groceries."}

    first, second = chat.calls
    assert first[0]["role"] == "system"
    assert first[0]["content"].startswith("Today is Wednesday, 2026-10-07.")
    assert first[1] == {"role": "user", "content": "How much on groceries last month?"}
    tool_result = json.loads(second[-1]["content"])
    assert second[-1]["tool_call_id"] == "call_0"
    assert tool_result["total"] == "1240.00"

    messages, run = _saved(db_engine, turn)
    assert [m.role for m in messages] == ["user", "assistant", "tool", "assistant"]
    assert all(m.run_id == run.id for m in messages[1:])
    assert str(messages[-1].id) == events[2].data["message_id"]
    assert run.status == RunStatus.COMPLETED
    assert (run.steps, run.prompt_tokens, run.completion_tokens) == (2, 200, 40)
    assert Decimal(run.cost_usd) == Decimal("0.003")
    assert run.finished_at is not None


def test_tool_mistakes_go_back_to_the_model(db_engine, turn) -> None:
    chat = FakeChat(
        _turn(calls=[("list_spend_items", {"limit": 500})]),
        _turn(text="Here are your purchases."),
    )
    _run(turn, chat)
    error = json.loads(chat.calls[1][-1]["content"])
    assert error["error"] == "invalid arguments"
    assert _saved(db_engine, turn)[1].status == RunStatus.COMPLETED


def test_step_limit_ends_with_a_fixed_reply(db_engine, turn) -> None:
    chat = FakeChat(_turn(calls=[("list_documents", {"limit": 5})]))
    events = _run(turn, chat)

    assert len(chat.calls) == MAX_STEPS
    assert [e.type for e in events] == ["tool"] * MAX_STEPS + ["delta", "done"]
    assert events[-2].data["text"] == runtime.STEP_LIMIT_REPLY
    messages, run = _saved(db_engine, turn)
    assert messages[-1].content == runtime.STEP_LIMIT_REPLY
    assert (run.status, run.error, run.steps) == (
        RunStatus.FAILED,
        "step limit",
        MAX_STEPS,
    )


def test_model_error_fails_the_run_without_a_reply(db_engine, turn) -> None:
    events = _run(turn, FakeChat(ai.RetryableChatError("openrouter error: 429")))

    assert [e.type for e in events] == ["error"]
    assert events[0].data["message"] == runtime.FAILED_REPLY
    messages, run = _saved(db_engine, turn)
    assert [m.role for m in messages] == ["user"]
    assert (run.status, run.error, run.steps) == (
        RunStatus.FAILED,
        "openrouter error: 429",
        0,
    )
    assert run.finished_at is not None


def test_crashing_tool_saves_nothing_half_done(db_engine, turn, monkeypatch) -> None:
    def boom(ctx, args):
        raise ValueError("bug")

    broken = tools.Tool("Broken.", tools.DocumentsArgs, boom)
    monkeypatch.setitem(tools.TOOLS, "list_documents", broken)
    events = _run(turn, FakeChat(_turn(calls=[("list_documents", {"limit": 5})])))

    assert [e.type for e in events] == ["tool", "error"]
    messages, run = _saved(db_engine, turn)
    assert [m.role for m in messages] == ["user"]
    assert (run.status, run.error, run.steps) == (RunStatus.FAILED, "ValueError", 1)


def test_unknown_cost_stays_unknown(db_engine, turn) -> None:
    _run(turn, FakeChat(_turn(text="Nothing to report.", cost=None)))
    run = _saved(db_engine, turn)[1]
    assert run.cost_usd is None
    assert run.status == RunStatus.COMPLETED


def test_next_turn_sees_the_previous_one(db_engine, turn) -> None:
    _run(
        turn,
        FakeChat(
            _turn(calls=[("get_spending_summary", {})]),
            _turn(text="$1,240.00 in total."),
        ),
    )
    with Session(db_engine) as session:
        conversation = crud.get_conversation(
            session, user_id=turn["user_id"], conversation_id=turn["conversation_id"]
        )
        _, run = crud.start_turn(
            session,
            conversation=conversation,
            content="And the month before?",
            model="fake/model",
            prompt_version="1",
        )
    chat = FakeChat(_turn(text="Nothing in August."))
    _run({**turn, "run_id": run.id}, chat)

    roles = [m["role"] for m in chat.calls[0]]
    assert roles == ["system", "user", "assistant", "tool", "assistant", "user"]
