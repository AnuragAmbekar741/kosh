"""spend items list index

Revision ID: 517ddb45356f
Revises: ac66af64a05e
Create Date: 2026-09-19 15:51:38.452785

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "517ddb45356f"
down_revision: str | Sequence[str] | None = "ac66af64a05e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "ix_spend_items_user_spent_id",
        "spend_items",
        [
            "user_id",
            sa.literal_column("spent_at DESC"),
            sa.literal_column("id DESC"),
        ],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_spend_items_user_spent_id", table_name="spend_items")
