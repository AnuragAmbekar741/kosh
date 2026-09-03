from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class AuthProvider(StrEnum):
    LOCAL = "local"
    GOOGLE = "google"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AuthIdentity(SQLModel, table=True):
    __tablename__ = "auth_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider", "provider_subject", name="uq_auth_identity_provider_subject"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    provider: str
    provider_subject: str
    password_hash: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RefreshSession(SQLModel, table=True):
    __tablename__ = "refresh_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    refresh_token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    revoked_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_used_at: datetime | None = None
