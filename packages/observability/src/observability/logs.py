import json
import logging
import sys
from datetime import UTC, datetime
from typing import TextIO

from observability.context import current
from observability.settings import get_settings

__all__ = ["JsonFormatter", "TextFormatter", "configure"]

_HANDLER_NAME = "observability"
_MAX_VALUE_CHARS = 512
_REDACTED = "[redacted]"

# Exact keys, not substrings: `prompt_tokens` is a count worth logging, `token` is not.
_SENSITIVE_KEYS = frozenset(
    {
        "access_token",
        "amount",
        "api_key",
        "authorization",
        "cookie",
        "description",
        "email",
        "filename",
        "id_token",
        "merchant",
        "password",
        "password_hash",
        "payload",
        "refresh_token",
        "secret",
        "token",
    }
)

# botocore logs signed request headers at DEBUG; the rest are per-call chatter.
_QUIET_LOGGERS = (
    "boto3",
    "botocore",
    "httpcore",
    "httpx",
    "openai",
    "s3transfer",
    "urllib3",
)

_RECORD_ATTRS = frozenset(vars(logging.LogRecord("", 0, "", 0, "", None, None))) | {
    "asctime",
    "color_message",
    "message",
}


def _fields(record: logging.LogRecord) -> dict[str, object]:
    extras = {k: v for k, v in vars(record).items() if k not in _RECORD_ATTRS}
    fields: dict[str, object] = {}
    for key, value in {**current(), **extras}.items():
        if value is None:
            continue
        if key.lower() in _SENSITIVE_KEYS:
            value = _REDACTED
        elif isinstance(value, str) and len(value) > _MAX_VALUE_CHARS:
            value = value[:_MAX_VALUE_CHARS] + "…"
        fields[key] = value
    return fields


class JsonFormatter(logging.Formatter):
    def __init__(self, service: str) -> None:
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        line: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname.lower(),
            "service": self.service,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in _fields(record).items():
            line.setdefault(key, value)
        if record.exc_info:
            line["exc"] = self.formatException(record.exc_info)
        return json.dumps(line, default=str)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = (
            datetime.fromtimestamp(record.created, UTC)
            .astimezone()
            .strftime("%H:%M:%S.%f")[:-3]
        )
        line = f"{ts} {record.levelname:<7} {record.name}: {record.getMessage()}"
        fields = " ".join(f"{k}={v}" for k, v in _fields(record).items())
        if fields:
            line = f"{line}  {fields}"
        if record.exc_info:
            line = f"{line}\n{self.formatException(record.exc_info)}"
        return line


class _StdoutHandler(logging.StreamHandler):
    """Looks up sys.stdout on every write, like logging's own _StderrHandler, so a
    swapped stream (pytest capture, reloaders) never leaves it writing to a closed file."""

    @property  # type: ignore[override]
    def stream(self) -> TextIO:
        return sys.stdout

    @stream.setter
    def stream(self, _value: TextIO) -> None:
        pass


def configure(service: str) -> None:
    """Install one stdout handler on the root logger. Apps call this at startup;
    packages only ever call `logging.getLogger(__name__)`. Calling it again replaces
    its own handler and leaves any other handler (pytest's caplog) in place."""
    settings = get_settings()
    handler = _StdoutHandler()
    handler.set_name(_HANDLER_NAME)
    handler.setFormatter(
        JsonFormatter(service) if settings.log_format == "json" else TextFormatter()
    )
    root = logging.getLogger()
    for existing in [h for h in root.handlers if h.get_name() == _HANDLER_NAME]:
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(settings.log_level)
    for name in _QUIET_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)
