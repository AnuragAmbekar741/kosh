"""drop spend item category

Revision ID: 6c91ca7d00dd
Revises: 517ddb45356f
Create Date: 2026-09-27 12:00:29.659512

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6c91ca7d00dd"
down_revision: str | Sequence[str] | None = "517ddb45356f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("spend_items", "category")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "spend_items",
        sa.Column("category", sa.VARCHAR(), autoincrement=False, nullable=True),
    )
