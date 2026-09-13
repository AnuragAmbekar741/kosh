from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status
from security import REFRESH_COOKIE, clear_refresh_cookie, set_refresh_cookie
from storage.models import User

from api.common.dependencies import SessionDep
from api.common.errors import InvalidRefreshError
from api.modules.auth.schemas import (
    AccessTokenResponse,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
)
from api.modules.auth.service import (
    login_google,
    login_local,
    register_local,
    revoke_refresh,
    rotate_refresh,
)
from api.modules.users.schemas import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(
    user: User, access_token: str, raw: str, response: Response
) -> AccessTokenResponse:
    set_refresh_cookie(response, raw)
    return AccessTokenResponse(
        access_token=access_token,
        user=UserPublic(id=user.id, name=user.name, email=user.email),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest, response: Response, session: SessionDep
) -> AccessTokenResponse:
    user, access_token, raw = register_local(
        session,
        name=body.name,
        email=str(body.email),
        password=body.password,
    )
    return _token_response(user, access_token, raw, response)


@router.post("/login")
def login(
    body: LoginRequest, response: Response, session: SessionDep
) -> AccessTokenResponse:
    user, access_token, raw = login_local(
        session, email=str(body.email), password=body.password
    )
    return _token_response(user, access_token, raw, response)


@router.post("/google")
def google(
    body: GoogleAuthRequest, response: Response, session: SessionDep
) -> AccessTokenResponse:
    user, access_token, raw = login_google(session, id_token=body.id_token)
    return _token_response(user, access_token, raw, response)


@router.post("/refresh")
def refresh(
    response: Response,
    session: SessionDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> AccessTokenResponse:
    if refresh_token is None:
        raise InvalidRefreshError
    user, access_token, raw = rotate_refresh(session, refresh_token)
    return _token_response(user, access_token, raw, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: SessionDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> None:
    revoke_refresh(session, refresh_token)
    clear_refresh_cookie(response)
