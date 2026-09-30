"""add catalog items

Revision ID: d606fed78df1
Revises: 3be059221fc0
Create Date: 2026-09-27 18:49:28.729714

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d606fed78df1"
down_revision: str | Sequence[str] | None = "3be059221fc0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "catalog_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "synonyms",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("retired", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["catalog_items.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        op.f("ix_catalog_items_name_key"), "catalog_items", ["name_key"], unique=False
    )
    op.create_index(
        op.f("ix_catalog_items_parent_id"), "catalog_items", ["parent_id"], unique=False
    )
    op.create_index(
        op.f("ix_catalog_items_user_id"), "catalog_items", ["user_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_catalog_items_user_id"), table_name="catalog_items")
    op.drop_index(op.f("ix_catalog_items_parent_id"), table_name="catalog_items")
    op.drop_index(op.f("ix_catalog_items_name_key"), table_name="catalog_items")
    op.drop_table("catalog_items")
