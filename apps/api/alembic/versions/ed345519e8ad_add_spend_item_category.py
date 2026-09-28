"""add spend item category

Revision ID: ed345519e8ad
Revises: 6c91ca7d00dd
Create Date: 2026-09-27 13:22:26.292077

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "ed345519e8ad"
down_revision: str | Sequence[str] | None = "6c91ca7d00dd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "spend_items",
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("spend_items", "category")
