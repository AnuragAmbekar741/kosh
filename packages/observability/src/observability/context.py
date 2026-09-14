from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar

__all__ = ["bound", "current"]

_fields: ContextVar[dict[str, object]] = ContextVar("log_fields")


@contextmanager
def bound(**fields: object) -> Iterator[None]:
    """Attach fields to every log line emitted inside the block, including lines
    from packages that know nothing about the caller."""
    token = _fields.set({**current(), **fields})
    try:
        yield
    finally:
        _fields.reset(token)


def current() -> dict[str, object]:
    return _fields.get({})
