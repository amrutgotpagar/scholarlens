"""add feedback table

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    feedback_rating = postgresql.ENUM("up", "down", name="feedback_rating", create_type=False)
    feedback_rating.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("rating", feedback_rating, nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_feedback_document_id", "feedback", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_feedback_document_id", table_name="feedback")
    op.drop_table("feedback")
    postgresql.ENUM(name="feedback_rating").drop(op.get_bind(), checkfirst=True)
