from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from security import (
    REFRESH_COOKIE,
    clear_refresh_cookie,
    set_refresh_cookie,
)
from sqlmodel import Session
from storage.database import get_session
from storage.models import User

from api.auth import (
    DuplicateEmailError,
    GoogleNotConfiguredError,
    GoogleUnavailableError,
    InvalidCredentialsError,
    InvalidGoogleTokenError,
    InvalidRefreshError,
    login_google,
    login_local,
    register_local,
    revoke_refresh,
    rotate_refresh,
)
from api.schemas import (
    AccessTokenResponse,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])
SessionDep = Annotated[Session, Depends(get_session)]


def _token_response(user: User, access_token: str, raw: str, response: Response) -> AccessTokenResponse:
    set_refresh_cookie(response, raw)
    return AccessTokenResponse(
        access_token=access_token,
        user=UserPublic(id=user.id, name=user.name, email=user.email),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest, response: Response, session: SessionDep
) -> AccessTokenResponse:
    try:
        user, access_token, raw = register_local(
            session,
            name=body.name,
            email=str(body.email),
            password=body.password,
        )
    except DuplicateEmailError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from None
    return _token_response(user, access_token, raw, response)


@router.post("/login")
def login(body: LoginRequest, response: Response, session: SessionDep) -> AccessTokenResponse:
    try:
        user, access_token, raw = login_local(
            session, email=str(body.email), password=body.password
        )
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from None
    return _token_response(user, access_token, raw, response)


@router.post("/google")
def google(
    body: GoogleAuthRequest, response: Response, session: SessionDep
) -> AccessTokenResponse:
    try:
        user, access_token, raw = login_google(session, id_token=body.id_token)
    except InvalidGoogleTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        ) from None
    except GoogleNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google auth is not configured",
        ) from None
    except GoogleUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google auth unavailable",
        ) from None
    return _token_response(user, access_token, raw, response)


@router.post("/refresh")
def refresh(
    response: Response,
    session: SessionDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> AccessTokenResponse:
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        user, access_token, raw = rotate_refresh(session, refresh_token)
    except InvalidRefreshError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        ) from None
    return _token_response(user, access_token, raw, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: SessionDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> None:
    revoke_refresh(session, refresh_token)
    clear_refresh_cookie(response)
