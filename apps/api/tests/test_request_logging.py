import logging

from api.common.request_logging import RequestLoggingMiddleware, _drop_duplicate_crash
from starlette.applications import Starlette
from starlette.routing import Route
from starlette.testclient import TestClient


def test_generates_request_id(client) -> None:
    response = client.get("/health")
    assert len(response.headers["x-request-id"]) == 32


def test_echoes_safe_inbound_request_id(client) -> None:
    response = client.get("/health", headers={"X-Request-ID": "web-abc.123"})
    assert response.headers["x-request-id"] == "web-abc.123"


def test_replaces_unsafe_inbound_request_id(client) -> None:
    response = client.get("/health", headers={"X-Request-ID": "not safe!"})
    assert response.headers["x-request-id"] != "not safe!"


def test_request_line_leaves_out_query_string(client, caplog) -> None:
    response = client.get("/spend-items?merchant=Walmart")
    (record,) = [r for r in caplog.records if r.name == "api.request"]
    assert record.getMessage() == "request finished"
    assert record.path == "/spend-items"
    assert record.status == response.status_code


def test_unhandled_error_is_logged_with_traceback(caplog) -> None:
    async def boom(_request):
        raise RuntimeError("boom")

    app = Starlette(routes=[Route("/boom", boom)])
    app.add_middleware(RequestLoggingMiddleware)
    with TestClient(app, raise_server_exceptions=False) as client:
        assert client.get("/boom").status_code == 500
    (record,) = [r for r in caplog.records if r.name == "api.request"]
    assert record.getMessage() == "request failed"
    assert record.levelno == logging.ERROR
    assert record.exc_info is not None


def test_uvicorn_crash_line_is_dropped_as_duplicate() -> None:
    def record(msg: str) -> logging.LogRecord:
        return logging.LogRecord(
            "uvicorn.error", logging.ERROR, __file__, 1, msg, (), None
        )

    assert not _drop_duplicate_crash(record("Exception in ASGI application\n"))
    assert _drop_duplicate_crash(record("Application startup complete."))
