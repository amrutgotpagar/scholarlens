import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Chunk, Document, DocumentStatus


def vector_search(
    db: Session,
    query_embedding: list[float],
    top_k: int,
    document_id: uuid.UUID | None = None,
) -> list[Chunk]:
    """Return the top_k chunks ranked by cosine distance to query_embedding, nearest first."""
    stmt = (
        select(Chunk)
        .join(Document)
        .where(Document.status == DocumentStatus.READY)
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    if document_id is not None:
        stmt = stmt.where(Chunk.document_id == document_id)
    return list(db.scalars(stmt))
