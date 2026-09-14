import json
import logging
import sys

import pytest
from observability import JsonFormatter, TextFormatter, bound, configure, current
from observability.settings import get_settings


def _record(msg: str = "hello", exc_info=None, **extra: object) -> logging.LogRecord:
    return logging.getLogger("test").makeRecord(
        "test", logging.INFO, __file__, 1, msg, (), exc_info, extra=extra
    )


def test_json_line_carries_context_and_extras() -> None:
    with bound(request_id="req-1"):
        line = json.loads(
            JsonFormatter("api").format(_record(document_id="doc-1", reason=None))
        )
    assert line["msg"] == "hello"
    assert line["level"] == "info"
    assert line["service"] == "api"
    assert line["request_id"] == "req-1"
    assert line["document_id"] == "doc-1"
    assert "reason" not in line


def test_sensitive_fields_are_redacted_by_exact_key() -> None:
    line = json.loads(
        JsonFormatter("api").format(
            _record(password="hunter2", merchant="Walmart", prompt_tokens=12)
        )
    )
    assert line["password"] == "[redacted]"
    assert line["merchant"] == "[redacted]"
    assert line["prompt_tokens"] == 12


def test_long_values_are_truncated() -> None:
    line = json.loads(JsonFormatter("worker").format(_record(reason="x" * 5000)))
    assert len(line["reason"]) <= 513


def test_exception_is_included() -> None:
    try:
        raise ValueError("boom")
    except ValueError:
        record = _record(exc_info=sys.exc_info())
    assert "ValueError: boom" in json.loads(JsonFormatter("api").format(record))["exc"]


def test_text_format_appends_fields() -> None:
    line = TextFormatter().format(_record(document_id="doc-1"))
    assert line.endswith("test: hello  document_id=doc-1")


def test_bound_restores_outer_context() -> None:
    with bound(request_id="outer"):
        with bound(document_id="inner"):
            assert current() == {"request_id": "outer", "document_id": "inner"}
        assert current() == {"request_id": "outer"}
    assert current() == {}


@pytest.fixture
def root_logger():
    root = logging.getLogger()
    handlers, level = list(root.handlers), root.level
    get_settings.cache_clear()
    yield root
    root.handlers[:] = handlers
    root.setLevel(level)
    get_settings.cache_clear()


def test_configure_replaces_only_its_own_handler(root_logger, monkeypatch) -> None:
    monkeypatch.setenv("LOG_FORMAT", "json")
    monkeypatch.setenv("LOG_LEVEL", "warning")
    foreign = logging.NullHandler()
    root_logger.addHandler(foreign)
    configure("api")
    configure("api")
    ours = [h for h in root_logger.handlers if h.get_name() == "observability"]
    assert len(ours) == 1
    assert isinstance(ours[0].formatter, JsonFormatter)
    assert foreign in root_logger.handlers
    assert root_logger.level == logging.WARNING
