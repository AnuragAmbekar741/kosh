"""auth identities and refresh sessions

Revision ID: 435a2adf8fbd
Revises: 3e249b0b6e2e
Create Date: 2026-09-02 23:26:11.710553

Does not backfill users.password_hash into auth_identities. Local/dev DB
is disposable — re-register after this revision. Do not apply to a
database that already has login-able users without a separate backfill.
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "435a2adf8fbd"
down_revision: str | Sequence[str] | None = "3e249b0b6e2e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "auth_identities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "provider_subject", sqlmodel.sql.sqltypes.AutoString(), nullable=False
        ),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider", "provider_subject", name="uq_auth_identity_provider_subject"
        ),
    )
    op.create_index(
        op.f("ix_auth_identities_user_id"), "auth_identities", ["user_id"], unique=False
    )
    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "refresh_token_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_refresh_sessions_refresh_token_hash"),
        "refresh_sessions",
        ["refresh_token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_refresh_sessions_user_id"),
        "refresh_sessions",
        ["user_id"],
        unique=False,
    )
    op.drop_column("users", "password_hash")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "users",
        sa.Column("password_hash", sa.VARCHAR(), autoincrement=False, nullable=True),
    )
    op.drop_index(op.f("ix_refresh_sessions_user_id"), table_name="refresh_sessions")
    op.drop_index(
        op.f("ix_refresh_sessions_refresh_token_hash"), table_name="refresh_sessions"
    )
    op.drop_table("refresh_sessions")
    op.drop_index(op.f("ix_auth_identities_user_id"), table_name="auth_identities")
    op.drop_table("auth_identities")
