from types import SimpleNamespace

import pytest
from ai import openrouter


def test_client_points_at_openrouter_with_the_key(monkeypatch) -> None:
    built: dict = {}
    settings = SimpleNamespace(require_openrouter=lambda: "sk-test")
    monkeypatch.setattr(openrouter, "get_settings", lambda: settings)
    monkeypatch.setattr(openrouter, "OpenAI", lambda **kwargs: built.update(kwargs))
    openrouter.client()
    assert built == {"base_url": "https://openrouter.ai/api/v1", "api_key": "sk-test"}


@pytest.mark.parametrize(
    ("status", "retryable"),
    [(None, True), (408, True), (409, True), (429, True), (503, True), (400, False)],
)
def test_is_retryable(status, retryable) -> None:
    assert openrouter.is_retryable(SimpleNamespace(status_code=status)) is retryable
