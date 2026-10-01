"""add item mapping fields and catalog aliases

Revision ID: b78e70fe494c
Revises: d606fed78df1
Create Date: 2026-09-30 01:15:49.890821

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "b78e70fe494c"
down_revision: str | Sequence[str] | None = "d606fed78df1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "catalog_aliases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("merchant_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(), nullable=True),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["catalog_item_id"],
            ["catalog_items.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "kind", "merchant_key", "key", name="uq_catalog_alias"
        ),
    )
    op.create_index(
        op.f("ix_catalog_aliases_user_id"), "catalog_aliases", ["user_id"], unique=False
    )
    op.add_column(
        "spend_items",
        sa.Column("category_source", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column("spend_items", sa.Column("catalog_item_id", sa.Uuid(), nullable=True))
    op.add_column(
        "spend_items",
        sa.Column(
            "item_status",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="none",
        ),
    )
    op.add_column(
        "spend_items",
        sa.Column("item_method", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "spend_items", sa.Column("item_claim_token", sa.Uuid(), nullable=True)
    )
    op.add_column(
        "spend_items", sa.Column("item_claimed_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "spend_items",
        sa.Column("item_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        op.f("ix_spend_items_catalog_item_id"),
        "spend_items",
        ["catalog_item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_spend_items_item_status"), "spend_items", ["item_status"], unique=False
    )
    op.create_foreign_key(
        "fk_spend_items_catalog_item_id",
        "spend_items",
        "catalog_items",
        ["catalog_item_id"],
        ["id"],
    )
    op.execute(
        "UPDATE spend_items SET category_source = CASE source "
        "WHEN 'document' THEN 'extraction' ELSE 'user' END "
        "WHERE category IS NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_spend_items_catalog_item_id", "spend_items", type_="foreignkey"
    )
    op.drop_index(op.f("ix_spend_items_item_status"), table_name="spend_items")
    op.drop_index(op.f("ix_spend_items_catalog_item_id"), table_name="spend_items")
    op.drop_column("spend_items", "item_attempts")
    op.drop_column("spend_items", "item_claimed_at")
    op.drop_column("spend_items", "item_claim_token")
    op.drop_column("spend_items", "item_method")
    op.drop_column("spend_items", "item_status")
    op.drop_column("spend_items", "catalog_item_id")
    op.drop_column("spend_items", "category_source")
    op.drop_index(op.f("ix_catalog_aliases_user_id"), table_name="catalog_aliases")
    op.drop_table("catalog_aliases")
