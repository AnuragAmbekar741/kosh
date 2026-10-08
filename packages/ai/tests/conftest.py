from types import SimpleNamespace

import pytest
from ai import openrouter


class FakeOpenAI:
    """Stands in for `openrouter.client()`; `seen` holds the last request's arguments."""

    def __init__(self) -> None:
        self.seen: dict = {}
        self.response = None
        self.error: Exception | None = None
        self.chat = SimpleNamespace(completions=self)

    def create(self, **kwargs):
        self.seen.clear()
        self.seen.update(kwargs)
        if self.error is not None:
            raise self.error
        return self.response


@pytest.fixture
def fake_openai(monkeypatch) -> FakeOpenAI:
    fake = FakeOpenAI()
    monkeypatch.setattr(openrouter, "client", lambda: fake)
    return fake
