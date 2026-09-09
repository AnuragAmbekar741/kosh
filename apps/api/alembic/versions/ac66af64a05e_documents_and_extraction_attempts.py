"""documents and extraction attempts

Revision ID: ac66af64a05e
Revises: fad46d3ec694
Create Date: 2026-09-09 01:24:15.053350

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ac66af64a05e"
down_revision: str | Sequence[str] | None = "fad46d3ec694"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("filename", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("mime_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("content_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("idempotency_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.Column("claim_token", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "idempotency_key", name="uq_document_user_idempotency"
        ),
    )
    op.create_index(
        op.f("ix_documents_content_hash"), "documents", ["content_hash"], unique=False
    )
    op.create_index(
        op.f("ix_documents_user_id"), "documents", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_documents_claim_token"), "documents", ["claim_token"], unique=False
    )
    op.create_table(
        "extraction_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False),
        sa.Column("model", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("provider", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id", "attempt_no", name="uq_extraction_attempt_document_no"
        ),
    )
    op.create_index(
        op.f("ix_extraction_attempts_document_id"),
        "extraction_attempts",
        ["document_id"],
        unique=False,
    )
    op.add_column("spend_items", sa.Column("document_id", sa.Uuid(), nullable=True))
    op.add_column(
        "spend_items", sa.Column("extraction_attempt_id", sa.Uuid(), nullable=True)
    )
    op.add_column("spend_items", sa.Column("line_index", sa.Integer(), nullable=True))
    op.add_column(
        "spend_items",
        sa.Column(
            "user_edited", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.create_index(
        op.f("ix_spend_items_document_id"), "spend_items", ["document_id"], unique=False
    )
    op.create_index(
        op.f("ix_spend_items_extraction_attempt_id"),
        "spend_items",
        ["extraction_attempt_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_spend_items_document_id",
        "spend_items",
        "documents",
        ["document_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_spend_items_extraction_attempt_id",
        "spend_items",
        "extraction_attempts",
        ["extraction_attempt_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_spend_items_extraction_attempt_id", "spend_items", type_="foreignkey"
    )
    op.drop_constraint("fk_spend_items_document_id", "spend_items", type_="foreignkey")
    op.drop_index(
        op.f("ix_spend_items_extraction_attempt_id"), table_name="spend_items"
    )
    op.drop_index(op.f("ix_spend_items_document_id"), table_name="spend_items")
    op.drop_column("spend_items", "user_edited")
    op.drop_column("spend_items", "line_index")
    op.drop_column("spend_items", "extraction_attempt_id")
    op.drop_column("spend_items", "document_id")
    op.drop_index(
        op.f("ix_extraction_attempts_document_id"), table_name="extraction_attempts"
    )
    op.drop_table("extraction_attempts")
    op.drop_index(op.f("ix_documents_user_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_claim_token"), table_name="documents")
    op.drop_index(op.f("ix_documents_content_hash"), table_name="documents")
    op.drop_table("documents")
