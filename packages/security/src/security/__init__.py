import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlmodel import Session
from storage.database import get_session
from storage.models import User

from security.google import (
    GoogleClaims,
    GoogleNotConfiguredError,
    GoogleUnavailableError,
    InvalidGoogleTokenError,
    verify_google_id_token,
)
from security.settings import get_settings

REFRESH_COOKIE = "refresh_token"
_ALGORITHM = "HS256"
_password_hash = PasswordHash.recommended()
_bearer = HTTPBearer(auto_error=False)

__all__ = [
    "REFRESH_COOKIE",
    "CurrentUserDep",
    "GoogleClaims",
    "GoogleNotConfiguredError",
    "GoogleUnavailableError",
    "InvalidGoogleTokenError",
    "clear_refresh_cookie",
    "create_access_token",
    "create_refresh_token",
    "decode_access_token",
    "get_current_user",
    "hash_password",
    "hash_refresh_token",
    "set_refresh_cookie",
    "verify_google_id_token",
    "verify_password",
]


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    exp = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": exp},
        settings.jwt_secret,
        algorithm=_ALGORITHM,
    )


def decode_access_token(token: str) -> UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        ) from None
    sub = payload.get("sub")
    try:
        return UUID(sub)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        ) from None


def create_refresh_token() -> tuple[str, str, datetime]:
    settings = get_settings()
    raw = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_days)
    return raw, hash_refresh_token(raw), expires_at


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def set_refresh_cookie(response: Response, raw: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        httponly=True,
        samesite="lax",
        path="/auth",
        secure=settings.cookie_secure,
        max_age=settings.refresh_token_days * 86400,
    )


def clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        REFRESH_COOKIE,
        path="/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = decode_access_token(creds.credentials)
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
