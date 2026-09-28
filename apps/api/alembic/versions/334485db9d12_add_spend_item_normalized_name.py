"""add spend item normalized name

Revision ID: 334485db9d12
Revises: ed345519e8ad
Create Date: 2026-09-27 18:16:54.735517

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "334485db9d12"
down_revision: str | Sequence[str] | None = "ed345519e8ad"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "spend_items",
        sa.Column("normalized_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("spend_items", "normalized_name")
