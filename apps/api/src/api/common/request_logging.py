import logging
import re
import time
from uuid import uuid4

from observability import bound, configure
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

__all__ = ["RequestLoggingMiddleware", "configure_logging"]

logger = logging.getLogger("api.request")

# Inbound ids are echoed and logged, so only short header-safe tokens are trusted.
_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")
_UVICORN_CRASH = "Exception in ASGI application"


def configure_logging() -> None:
    configure("api")
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True
    # Replaced by the middleware's request line, which leaves out the query string
    # (merchant and category filters live there).
    logging.getLogger("uvicorn.access").disabled = True
    logging.getLogger("uvicorn.error").addFilter(_drop_duplicate_crash)


def _drop_duplicate_crash(record: logging.LogRecord) -> bool:
    # RequestLoggingMiddleware already logged this traceback, with the request id.
    return not record.getMessage().startswith(_UVICORN_CRASH)


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = _request_id(scope)
        started = time.perf_counter()
        status = 500

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message).append("X-Request-ID", request_id)
            await send(message)

        with bound(request_id=request_id):
            try:
                await self.app(scope, receive, send_with_id)
            except Exception:
                logger.exception("request failed", extra=_summary(scope, 500, started))
                raise
            level = logging.ERROR if status >= 500 else logging.INFO
            logger.log(
                level, "request finished", extra=_summary(scope, status, started)
            )


def _request_id(scope: Scope) -> str:
    for key, value in scope["headers"]:
        if key == b"x-request-id":
            candidate = value.decode("latin-1")
            if _REQUEST_ID.fullmatch(candidate):
                return candidate
    return uuid4().hex


def _summary(scope: Scope, status: int, started: float) -> dict[str, object]:
    return {
        "method": scope["method"],
        "path": scope["path"],
        "status": status,
        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
    }
