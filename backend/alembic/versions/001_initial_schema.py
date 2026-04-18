"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-03-29 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # We will rely on Base.metadata.create_all() for the hackathon context
    pass

def downgrade() -> None:
    pass
