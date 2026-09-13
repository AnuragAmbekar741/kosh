from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from security import (
    GoogleNotConfiguredError,
    GoogleUnavailableError,
    InvalidGoogleTokenError,
)

from api.common.errors import DomainError


def _json(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail})


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        return _json(exc.status_code, exc.detail)

    @app.exception_handler(InvalidGoogleTokenError)
    async def invalid_google_token(
        _request: Request, _exc: InvalidGoogleTokenError
    ) -> JSONResponse:
        return _json(401, "Invalid Google token")

    @app.exception_handler(GoogleNotConfiguredError)
    async def google_not_configured(
        _request: Request, _exc: GoogleNotConfiguredError
    ) -> JSONResponse:
        return _json(503, "Google auth is not configured")

    @app.exception_handler(GoogleUnavailableError)
    async def google_unavailable(
        _request: Request, _exc: GoogleUnavailableError
    ) -> JSONResponse:
        return _json(503, "Google auth unavailable")
