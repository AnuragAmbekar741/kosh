"""add spend item line details

Revision ID: 3be059221fc0
Revises: 334485db9d12
Create Date: 2026-09-27 18:47:56.864316

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "3be059221fc0"
down_revision: str | Sequence[str] | None = "334485db9d12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "spend_items",
        sa.Column("item_code", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "spend_items",
        sa.Column("quantity", sa.Numeric(precision=12, scale=3), nullable=True),
    )
    op.add_column(
        "spend_items",
        sa.Column("unit_price", sa.Numeric(precision=12, scale=4), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("spend_items", "unit_price")
    op.drop_column("spend_items", "quantity")
    op.drop_column("spend_items", "item_code")
