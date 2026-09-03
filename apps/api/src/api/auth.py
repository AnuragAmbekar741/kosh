from security import (
    GoogleNotConfiguredError,
    GoogleUnavailableError,
    InvalidGoogleTokenError,
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_google_id_token,
    verify_password,
)
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from storage.crud.user import (
    add_google_identity,
    consume_and_replace_refresh,
    create_refresh_session,
    create_user_with_google_identity,
    create_user_with_local_identity,
    get_identity_by_provider,
    get_local_identity_by_email,
    get_refresh_session_by_hash,
    get_user_by_email,
    get_user_by_id,
    revoke_session,
)
from storage.models import AuthProvider, User

__all__ = [
    "DuplicateEmailError",
    "GoogleNotConfiguredError",
    "GoogleUnavailableError",
    "InvalidCredentialsError",
    "InvalidGoogleTokenError",
    "InvalidRefreshError",
    "login_google",
    "login_local",
    "register_local",
    "revoke_refresh",
    "rotate_refresh",
]


class DuplicateEmailError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidRefreshError(Exception):
    pass


def _issue(session: Session, user: User) -> tuple[User, str, str]:
    access_token = create_access_token(user.id)
    raw, token_hash, expires_at = create_refresh_token()
    create_refresh_session(
        session,
        user_id=user.id,
        refresh_token_hash=token_hash,
        expires_at=expires_at,
    )
    return user, access_token, raw


def register_local(
    session: Session, *, name: str, email: str, password: str
) -> tuple[User, str, str]:
    email = email.lower()
    if get_user_by_email(session, email) is not None:
        raise DuplicateEmailError
    try:
        user = create_user_with_local_identity(
            session,
            name=name,
            email=email,
            password_hash=hash_password(password),
        )
    except IntegrityError:
        session.rollback()
        raise DuplicateEmailError from None
    return _issue(session, user)


def login_google(session: Session, *, id_token: str) -> tuple[User, str, str]:
    claims = verify_google_id_token(id_token)
    identity = get_identity_by_provider(
        session, AuthProvider.GOOGLE, claims.subject
    )
    if identity is not None:
        user = get_user_by_id(session, identity.user_id)
        if user is None:
            raise InvalidGoogleTokenError
        return _issue(session, user)

    email = claims.email.lower()
    user = get_user_by_email(session, email)
    try:
        if user is None:
            user = create_user_with_google_identity(
                session,
                name=claims.name,
                email=email,
                subject=claims.subject,
            )
        else:
            # ponytail: Google email_verified proves ownership; local register does not
            add_google_identity(session, user_id=user.id, subject=claims.subject)
    except IntegrityError:
        session.rollback()
        identity = get_identity_by_provider(
            session, AuthProvider.GOOGLE, claims.subject
        )
        if identity is None:
            raise InvalidGoogleTokenError from None
        user = get_user_by_id(session, identity.user_id)
        if user is None:
            raise InvalidGoogleTokenError from None
    return _issue(session, user)


def login_local(
    session: Session, *, email: str, password: str
) -> tuple[User, str, str]:
    email = email.lower()
    identity = get_local_identity_by_email(session, email)
    if (
        identity is None
        or identity.password_hash is None
        or not verify_password(password, identity.password_hash)
    ):
        raise InvalidCredentialsError
    user = get_user_by_id(session, identity.user_id)
    if user is None:
        raise InvalidCredentialsError
    return _issue(session, user)


def rotate_refresh(session: Session, raw_token: str) -> tuple[User, str, str]:
    raw, token_hash, expires_at = create_refresh_token()
    rotated = consume_and_replace_refresh(
        session,
        hash_refresh_token(raw_token),
        refresh_token_hash=token_hash,
        expires_at=expires_at,
    )
    if rotated is None:
        raise InvalidRefreshError
    user = get_user_by_id(session, rotated.user_id)
    if user is None:
        raise InvalidRefreshError
    return user, create_access_token(user.id), raw


def revoke_refresh(session: Session, raw_token: str | None) -> None:
    if raw_token is None:
        return
    row = get_refresh_session_by_hash(session, hash_refresh_token(raw_token))
    if row is not None and row.revoked_at is None:
        revoke_session(session, row)
