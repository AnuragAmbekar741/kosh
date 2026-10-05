import json

import ai.openrouter as client_mod
import pytest
from ai import ExtractError, ItemLine, RetryableExtractError, classify_items
from ai.items.classify import ItemChoices
from ai.openrouter import strict_json_schema
from openai import APIStatusError


class _Response:
    def __init__(self, content: str | None) -> None:
        message = type("M", (), {"content": content})()
        self.choices = [type("C", (), {"message": message})()]
        self.model = "fake/model"
        self.provider = "fake"
        self.usage = type("U", (), {"prompt_tokens": 10, "completion_tokens": 5})()


def _fake_openai(monkeypatch, *, content=None, error=None) -> dict:
    seen: dict = {}

    class _Completions:
        def create(self, **kwargs):
            seen.update(kwargs)
            if error is not None:
                raise error
            return _Response(content)

    class _OpenAI:
        def __init__(self, **_):
            self.chat = type("Chat", (), {"completions": _Completions()})()

    monkeypatch.setattr(client_mod, "OpenAI", _OpenAI)
    monkeypatch.setattr(
        client_mod,
        "get_settings",
        lambda: type(
            "S",
            (),
            {
                "require_openrouter": lambda self: "key",
                "openrouter_model": "base/model",
                "openrouter_item_model": None,
            },
        )(),
    )
    monkeypatch.setattr("ai.items.classify.get_settings", client_mod.get_settings)
    return seen


_LINES = [ItemLine(ref=0, text="KS ORG CHX BRST", cleaned=None, amount="18.99")]


def test_schema_is_strict() -> None:
    schema = strict_json_schema(ItemChoices)
    choice = schema["properties"]["choices"]["items"]
    assert set(choice["required"]) == {"ref", "outcome", "slug", "confidence"}
    assert choice["additionalProperties"] is False


def test_returns_choices_and_sends_catalog(monkeypatch) -> None:
    answer = {
        "choices": [
            {"ref": 0, "outcome": "match", "slug": "chicken-breast", "confidence": 0.9}
        ]
    }
    seen = _fake_openai(monkeypatch, content=json.dumps(answer))
    choices, meta = classify_items("Costco", _LINES, "chicken: chicken-breast")
    assert [(c.ref, c.slug) for c in choices] == [(0, "chicken-breast")]
    assert seen["model"] == "base/model"
    text = seen["messages"][0]["content"][0]["text"]
    assert "chicken: chicken-breast" in text and "KS ORG CHX BRST" in text
    assert meta.prompt_tokens == 10


def test_invalid_output_is_an_error(monkeypatch) -> None:
    _fake_openai(monkeypatch, content='{"choices": [{"ref": 0}]}')
    with pytest.raises(ExtractError, match="invalid model output"):
        classify_items("Costco", _LINES, "")


def test_rate_limits_are_retryable(monkeypatch) -> None:
    request = type("R", (), {"method": "POST", "url": "x", "headers": {}})()
    response = type(
        "Resp", (), {"status_code": 429, "request": request, "headers": {}}
    )()
    error = APIStatusError("rate limited", response=response, body=None)
    _fake_openai(monkeypatch, error=error)
    with pytest.raises(RetryableExtractError):
        classify_items("Costco", _LINES, "")
