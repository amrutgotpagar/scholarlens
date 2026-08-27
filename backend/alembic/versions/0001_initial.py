"""initial schema: documents, chunks, pgvector

Revision ID: 0001
Revises:
Create Date: 2026-08-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from app.config import get_settings

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Column width follows whichever LLM_PROVIDER is active at migration time (see
# Settings.active_embedding_dim). Switching providers after this migration has
# run against a real database requires a follow-up migration to ALTER the column.
EMBEDDING_DIM = get_settings().active_embedding_dim

# Both of pgvector's ANN index types (ivfflat, hnsw) cap out at 2000 dimensions per vector
# (an index tuple must fit in an 8KB Postgres page) — some hosted embedding models exceed
# that (e.g. NVIDIA's nemotron-3-embed-1b is a fixed 2048-dim, no truncation option). Above
# the limit, skip the ANN index entirely rather than fail the migration: cosine search still
# works correctly via a sequential scan, just without index acceleration. Fine at portfolio
# scale; a real high-QPS deployment on a >2000-dim model would need pgvector's halfvec type
# instead (doubles the usable dimension ceiling at half the storage per dimension).
CAN_INDEX_EMBEDDING = EMBEDDING_DIM <= 2000


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # create_type=False: the column below creates the enum type itself via
    # create_table's own DDL. Pre-creating it here too causes a DuplicateObject
    # error because op.create_table's enum-creation path does not check first.
    document_status = postgresql.ENUM(
        "pending", "processing", "ready", "failed", name="document_status", create_type=False
    )
    document_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("title", sa.String(1024), nullable=True),
        sa.Column("content_type", sa.String(128), nullable=False),
        sa.Column("byte_size", sa.Integer, nullable=False),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column(
            "status",
            document_status,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("page_number", sa.Integer, nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("token_count", sa.Integer, nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_chunk_document_index"),
    )

    if CAN_INDEX_EMBEDDING:
        op.create_index(
            "ix_chunks_embedding_cosine",
            "chunks",
            ["embedding"],
            postgresql_using="ivfflat",
            postgresql_with={"lists": 100},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        )
    op.create_index("ix_chunks_document_id", "chunks", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_chunks_document_id", table_name="chunks")
    if CAN_INDEX_EMBEDDING:
        op.drop_index("ix_chunks_embedding_cosine", table_name="chunks")
    op.drop_table("chunks")
    op.drop_table("documents")
    postgresql.ENUM(name="document_status").drop(op.get_bind(), checkfirst=True)
    op.execute("DROP EXTENSION IF EXISTS vector")
