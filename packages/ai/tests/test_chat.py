import ai.chat as chat_mod
import pytest
from ai import (
    ChatError,
    RetryableChatError,
    chat_with_tools,
    function_tool,
)
from openai import APIStatusError
from pydantic import BaseModel, Field


def _obj(**fields):
    return type("O", (), fields)()


def _call(id_, name, arguments):
    return _obj(id=id_, type="function", function=_obj(name=name, arguments=arguments))


def _response(*, content=None, tool_calls=None, usage=True, choices=True):
    message = _obj(content=content, tool_calls=tool_calls)
    return _obj(
        choices=[_obj(message=message)] if choices else [],
        model="fake/served",
        provider="fake",
        usage=_obj(prompt_tokens=120, completion_tokens=30, cost=0.000245)
        if usage
        else None,
    )


def _fake_openai(monkeypatch, *, response=None, error=None, agent_model=None):
    seen: dict = {}

    class _Completions:
        def create(self, **kwargs):
            seen.update(kwargs)
            if error is not None:
                raise error
            return response

    class _OpenAI:
        def __init__(self, **kwargs):
            seen["client"] = kwargs
            self.chat = _obj(completions=_Completions())

    settings = _obj(
        require_openrouter=lambda *_: "key",
        openrouter_model="base/model",
        openrouter_agent_model=agent_model,
    )
    monkeypatch.setattr(chat_mod, "OpenAI", _OpenAI)
    monkeypatch.setattr(chat_mod, "get_settings", lambda: settings)
    return seen


def _status_error(code: int) -> APIStatusError:
    request = _obj(method="POST", url="https://openrouter.ai")
    response = _obj(status_code=code, headers={}, request=request)
    return APIStatusError("boom", response=response, body=None)


_HISTORY = [{"role": "user", "content": "How much on groceries?"}]


class _Args(BaseModel):
    category: str | None = Field(default=None, description="Spend category")
    limit: int = Field(default=20, ge=1, le=50)


def test_function_tool_shape() -> None:
    tool = function_tool("list_spend_items", "List spend rows.", _Args)
    assert tool["type"] == "function"
    fn = tool["function"]
    assert (fn["name"], fn["description"]) == ("list_spend_items", "List spend rows.")
    params = fn["parameters"]
    assert set(params["properties"]) == {"category", "limit"}
    assert params["additionalProperties"] is False
    assert "$defs" not in params and "default" not in params["properties"]["limit"]


def test_text_reply(monkeypatch) -> None:
    seen = _fake_openai(monkeypatch, response=_response(content="₹1,240 in Sep."))
    turn = chat_with_tools(_HISTORY, [])

    assert turn.message == {"role": "assistant", "content": "₹1,240 in Sep."}
    assert turn.tool_calls == []
    assert (turn.prompt_tokens, turn.completion_tokens) == (120, 30)
    assert turn.cost_usd == "0.000245"
    assert (turn.model, turn.provider) == ("fake/served", "fake")
    assert seen["model"] == "base/model"
    assert seen["max_tokens"] == 800
    assert "tools" not in seen
    assert seen["extra_body"]["provider"] == {"require_parameters": True}
    assert seen["extra_body"]["usage"] == {"include": True}
    assert seen["client"]["base_url"] == "https://openrouter.ai/api/v1"


def test_tool_calls_keep_openai_shape(monkeypatch) -> None:
    calls = [
        _call("c1", "get_spending_summary", '{"category": "Groceries"}'),
        _call("c2", "list_spend_items", ""),
    ]
    tool = function_tool("list_spend_items", "List.", _Args)
    seen = _fake_openai(monkeypatch, response=_response(tool_calls=calls))
    turn = chat_with_tools(_HISTORY, [tool], model="other/model")

    assert turn.message == {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "c1",
                "type": "function",
                "function": {
                    "name": "get_spending_summary",
                    "arguments": '{"category": "Groceries"}',
                },
            },
            {
                "id": "c2",
                "type": "function",
                "function": {"name": "list_spend_items", "arguments": "{}"},
            },
        ],
    }
    assert [c["id"] for c in turn.tool_calls] == ["c1", "c2"]
    assert seen["model"] == "other/model"
    assert seen["tools"] == [tool]


def test_agent_model_setting_wins_over_base(monkeypatch) -> None:
    seen = _fake_openai(
        monkeypatch, response=_response(content="ok"), agent_model="cheap/model"
    )
    chat_with_tools(_HISTORY, [])
    assert seen["model"] == "cheap/model"


def test_missing_usage_is_zero_and_no_cost(monkeypatch) -> None:
    _fake_openai(monkeypatch, response=_response(content="ok", usage=False))
    turn = chat_with_tools(_HISTORY, [])
    assert (turn.prompt_tokens, turn.completion_tokens, turn.cost_usd) == (0, 0, None)


@pytest.mark.parametrize("response", [_response(), _response(choices=False)])
def test_empty_answer_is_an_error(monkeypatch, response) -> None:
    _fake_openai(monkeypatch, response=response)
    with pytest.raises(ChatError, match="empty model response"):
        chat_with_tools(_HISTORY, [])


@pytest.mark.parametrize(
    ("code", "error"),
    [(429, RetryableChatError), (503, RetryableChatError), (400, ChatError)],
)
def test_api_errors(monkeypatch, code, error) -> None:
    _fake_openai(monkeypatch, error=_status_error(code))
    with pytest.raises(error) as raised:
        chat_with_tools(_HISTORY, [])
    assert (type(raised.value) is RetryableChatError) == (code != 400)


class _SummaryArgs(BaseModel):
    category: str = Field(description="Spend category, for example Groceries")


@pytest.mark.llm
def test_live_tool_round_trip() -> None:
    import json

    tools = [
        function_tool(
            "get_spending_summary",
            "Total spend for one category. Always use it for spending questions.",
            _SummaryArgs,
        )
    ]
    history = [{"role": "user", "content": "How much did I spend on Groceries?"}]
    first = chat_with_tools(history, tools)
    assert first.tool_calls, first.message
    call = first.tool_calls[0]
    assert call["function"]["name"] == "get_spending_summary"
    assert json.loads(call["function"]["arguments"])["category"] == "Groceries"

    history += [
        first.message,
        {"role": "tool", "tool_call_id": call["id"], "content": '{"total": "1240.00"}'},
    ]
    second = chat_with_tools(history, tools)
    assert "1240" in (second.message["content"] or "").replace(",", "")
    assert second.prompt_tokens > 0
