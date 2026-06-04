"""add_waypoint_end_time

Revision ID: a3c9f1e2b5d7
Revises: 78ef8300ba7d
Create Date: 2026-06-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3c9f1e2b5d7'
down_revision: Union[str, None] = '78ef8300ba7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('waypoints', sa.Column('end_time', sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column('waypoints', 'end_time')
