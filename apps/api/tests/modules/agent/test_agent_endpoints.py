import json
import threading
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import ai
import pytest
from api.modules.agent import service
from fastapi.testclient import TestClient
from sqlmodel import Session
from storage import database
from storage.crud import agent as crud
from storage.models import AgentConversation, AgentRun, RunStatus


def _auth(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": f"{uuid4().hex}@x.io", "password": "password1"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _turn(*, text=None, call=None) -> ai.ChatTurn:
    message: ai.ChatMessage = {"role": "assistant", "content": text}
    if call:
        message["tool_calls"] = [
            {
                "id": "call_0",
                "type": "function",
                "function": {"name": call, "arguments": "{}"},
            }
        ]
    return ai.ChatTurn(
        message=message,
        model="fake/model",
        provider="fake",
        prompt_tokens=10,
        completion_tokens=5,
        cost_usd="0.001",
    )


class Model:
    """The scripted model every request in a test talks to."""

    def __init__(self) -> None:
        self.script: list = [
            _turn(call="get_spending_summary"),
            _turn(text="You have no spending yet."),
        ]
        self.gate: threading.Event | None = None

    def __call__(self, messages, schemas, *, model):
        assert database.engine.pool.checkedout() == 0, "DB connection held"
        if self.gate is not None and len(self.script) == 1:
            assert self.gate.wait(5)
        turn = self.script.pop(0)
        if isinstance(turn, Exception):
            raise turn
        return turn


@pytest.fixture
def model(monkeypatch) -> Model:
    fake = Model()
    monkeypatch.setattr(ai, "chat_with_tools", fake)
    monkeypatch.setattr(ai, "agent_model", lambda: "fake/model")
    monkeypatch.setattr(
        service, "get_ai_settings", lambda: SimpleNamespace(openrouter_api_key="k")
    )
    monkeypatch.setattr(
        service, "get_settings", lambda: SimpleNamespace(agent_daily_runs=50)
    )
    return fake


def _events(body: str) -> list[tuple[str, dict]]:
    events = []
    for block in body.strip().split("\n\n"):
        kind, data = block.split("\n")
        assert kind.startswith("event: ") and data.startswith("data: ")
        events.append((kind.removeprefix("event: "), json.loads(data[6:])))
    return events


def _new(client, headers) -> str:
    response = client.post("/agent/conversations", headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


def _send(client, headers, conversation_id, text="How much did I spend?"):
    return client.post(
        f"/agent/conversations/{conversation_id}/messages",
        headers=headers,
        json={"text": text},
    )


def test_every_endpoint_needs_a_login(client) -> None:
    some_id = uuid4()
    assert client.post("/agent/conversations").status_code == 401
    assert client.get("/agent/conversations").status_code == 401
    assert client.get(f"/agent/conversations/{some_id}").status_code == 401
    assert (
        client.post(
            f"/agent/conversations/{some_id}/messages", json={"text": "hi"}
        ).status_code
        == 401
    )


def test_send_streams_the_reply_and_saves_it(client, model) -> None:
    headers = _auth(client)
    conversation_id = _new(client, headers)

    response = _send(client, headers, conversation_id)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = _events(response.text)
    assert [kind for kind, _ in events] == ["tool", "delta", "done"]
    assert events[0][1] == {"name": "get_spending_summary"}
    assert events[1][1] == {"text": "You have no spending yet."}

    detail = client.get(f"/agent/conversations/{conversation_id}", headers=headers)
    body = detail.json()
    assert body["title"] == "How much did I spend?"
    assert [(m["role"], m["content"], m["status"]) for m in body["messages"]] == [
        ("user", "How much did I spend?", "completed"),
        ("assistant", "You have no spending yet.", None),
    ]
    assert body["messages"][1]["id"] == events[2][1]["message_id"]


def test_conversations_are_private(client, model) -> None:
    ada, bob = _auth(client), _auth(client)
    conversation_id = _new(client, ada)
    url = f"/agent/conversations/{conversation_id}"
    assert client.get(url, headers=bob).status_code == 404
    assert _send(client, bob, conversation_id).status_code == 404
    assert client.get("/agent/conversations", headers=bob).json() == {
        "data": [],
        "total": 0,
    }


def test_list_is_most_recent_first_and_paged(client, model) -> None:
    headers = _auth(client)
    first, second = _new(client, headers), _new(client, headers)
    _send(client, headers, first)

    page = client.get("/agent/conversations?limit=1", headers=headers).json()
    assert page["total"] == 2
    assert [c["id"] for c in page["data"]] == [first]
    rest = client.get("/agent/conversations?skip=1", headers=headers).json()
    assert [c["id"] for c in rest["data"]] == [second]


@pytest.mark.parametrize("text", ["", "   ", "x" * 4001])
def test_blank_or_long_text_is_rejected(client, model, text) -> None:
    headers = _auth(client)
    conversation_id = _new(client, headers)
    assert _send(client, headers, conversation_id, text).status_code == 422


def _open_run(conversation_id: str, started_at: datetime | None = None) -> None:
    with Session(database.engine) as session:
        run = session.get(AgentRun, _start(session, conversation_id))
        if started_at is not None:
            run.started_at = started_at
            session.add(run)
            session.commit()


def _start(session, conversation_id) -> UUID:
    conversation = session.get(AgentConversation, UUID(conversation_id))
    _, run = crud.start_turn(
        session,
        conversation=conversation,
        content="earlier",
        model="fake/model",
        prompt_version="1",
    )
    return run.id


def test_one_reply_at_a_time_unless_the_other_died(client, model) -> None:
    headers = _auth(client)
    conversation_id = _new(client, headers)
    _open_run(conversation_id)
    response = _send(client, headers, conversation_id)
    assert response.status_code == 409

    stale = _new(client, headers)
    _open_run(stale, datetime.now(UTC) - service.STALE_AFTER - timedelta(minutes=1))
    assert _send(client, headers, stale).status_code == 200
    statuses = [
        m["status"]
        for m in client.get(f"/agent/conversations/{stale}", headers=headers).json()[
            "messages"
        ]
        if m["role"] == "user"
    ]
    assert statuses == ["failed", "completed"]


def test_daily_limit(client, model, monkeypatch) -> None:
    monkeypatch.setattr(
        service, "get_settings", lambda: SimpleNamespace(agent_daily_runs=1)
    )
    headers = _auth(client)
    conversation_id = _new(client, headers)
    assert _send(client, headers, conversation_id).status_code == 200
    response = _send(client, headers, conversation_id)
    assert response.status_code == 429
    assert response.json() == {"detail": "daily message limit reached"}


def test_unconfigured_model_is_503(client, model, monkeypatch) -> None:
    monkeypatch.setattr(
        service, "get_ai_settings", lambda: SimpleNamespace(openrouter_api_key=None)
    )
    headers = _auth(client)
    response = _send(client, headers, _new(client, headers))
    assert response.status_code == 503


def test_model_error_streams_an_error_and_marks_the_message(client, model) -> None:
    model.script = [ai.ChatError("openrouter error: 400")]
    headers = _auth(client)
    conversation_id = _new(client, headers)

    events = _events(_send(client, headers, conversation_id).text)
    assert [kind for kind, _ in events] == ["error"]
    messages = client.get(
        f"/agent/conversations/{conversation_id}", headers=headers
    ).json()["messages"]
    assert [(m["role"], m["status"]) for m in messages] == [("user", "failed")]


def test_reply_finishes_after_the_browser_leaves(client, model) -> None:
    headers = _auth(client)
    conversation_id = _new(client, headers)
    with Session(database.engine) as session:
        conversation = session.get(AgentConversation, UUID(conversation_id))
        run = service.start_message(
            session, conversation.user_id, conversation.id, "hi"
        )
    model.gate = threading.Event()

    stream = service.stream(run)
    assert next(stream).startswith("event: tool")
    stream.close()  # the browser went away mid-turn
    model.gate.set()
    for thread in threading.enumerate():
        if thread.name == f"agent-run-{run.id}":
            thread.join(5)

    with Session(database.engine) as session:
        assert session.get(AgentRun, run.id).status == RunStatus.COMPLETED
        roles = [
            m.role
            for m in crud.list_messages(session, conversation_id=run.conversation_id)
        ]
    assert roles == ["user", "assistant", "tool", "assistant"]
