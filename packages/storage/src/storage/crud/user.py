from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Session, select

from storage.models.user import AuthIdentity, AuthProvider, RefreshSession, User

__all__ = [
    "add_google_identity",
    "consume_and_replace_refresh",
    "create_refresh_session",
    "create_user_with_google_identity",
    "create_user_with_local_identity",
    "get_identity_by_provider",
    "get_local_identity_by_email",
    "get_refresh_session_by_hash",
    "get_user_by_email",
    "get_user_by_id",
    "revoke_session",
]


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def get_user_by_id(session: Session, user_id: UUID) -> User | None:
    return session.get(User, user_id)


def create_user_with_local_identity(
    session: Session, *, name: str, email: str, password_hash: str
) -> User:
    user = User(name=name, email=email)
    session.add(user)
    session.flush()
    session.add(
        AuthIdentity(
            user_id=user.id,
            provider=AuthProvider.LOCAL,
            provider_subject=email,
            password_hash=password_hash,
        )
    )
    session.commit()
    session.refresh(user)
    return user


def get_identity_by_provider(
    session: Session, provider: str, subject: str
) -> AuthIdentity | None:
    return session.exec(
        select(AuthIdentity).where(
            AuthIdentity.provider == provider,
            AuthIdentity.provider_subject == subject,
        )
    ).first()


def get_local_identity_by_email(session: Session, email: str) -> AuthIdentity | None:
    return get_identity_by_provider(session, AuthProvider.LOCAL, email)


def create_user_with_google_identity(
    session: Session, *, name: str, email: str, subject: str
) -> User:
    user = User(name=name, email=email)
    session.add(user)
    session.flush()
    session.add(
        AuthIdentity(
            user_id=user.id,
            provider=AuthProvider.GOOGLE,
            provider_subject=subject,
        )
    )
    session.commit()
    session.refresh(user)
    return user


def add_google_identity(
    session: Session, *, user_id: UUID, subject: str
) -> AuthIdentity:
    identity = AuthIdentity(
        user_id=user_id,
        provider=AuthProvider.GOOGLE,
        provider_subject=subject,
    )
    session.add(identity)
    session.commit()
    session.refresh(identity)
    return identity


def create_refresh_session(
    session: Session,
    *,
    user_id: UUID,
    refresh_token_hash: str,
    expires_at: datetime,
) -> RefreshSession:
    row = RefreshSession(
        user_id=user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=expires_at,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def get_refresh_session_by_hash(
    session: Session, token_hash: str
) -> RefreshSession | None:
    return session.exec(
        select(RefreshSession).where(RefreshSession.refresh_token_hash == token_hash)
    ).first()


def revoke_session(session: Session, row: RefreshSession) -> None:
    row.revoked_at = datetime.now(UTC)
    session.add(row)
    session.commit()


def consume_and_replace_refresh(
    session: Session,
    token_hash: str,
    *,
    refresh_token_hash: str,
    expires_at: datetime,
) -> RefreshSession | None:
    row = session.exec(
        select(RefreshSession)
        .where(RefreshSession.refresh_token_hash == token_hash)
        .with_for_update()
    ).first()
    if row is None or row.revoked_at is not None:
        return None
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        return None
    now = datetime.now(UTC)
    row.revoked_at = now
    row.last_used_at = now
    new = RefreshSession(
        user_id=row.user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=expires_at,
    )
    session.add(row)
    session.add(new)
    session.commit()
    session.refresh(new)
    return new
