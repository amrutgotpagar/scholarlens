"""move file storage from Postgres bytea to S3 (presigned uploads)

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("documents", "file_data")
    op.add_column("documents", sa.Column("s3_key", sa.String(512), nullable=False))


def downgrade() -> None:
    op.drop_column("documents", "s3_key")
    op.add_column("documents", sa.Column("file_data", sa.LargeBinary(), nullable=True))
