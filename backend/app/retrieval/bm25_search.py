import uuid

from rank_bm25 import BM25Okapi
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Chunk, Document, DocumentStatus


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def bm25_search(
    db: Session,
    query: str,
    top_k: int,
    document_id: uuid.UUID | None = None,
    owner_id: str | None = None,
) -> list[Chunk]:
    """Return the top_k chunks ranked by BM25 score against query, highest first.

    Builds an in-memory BM25 index over the candidate scope on every call. This is fine at
    portfolio/demo scale (a handful of papers); a corpus large enough to matter would move
    this to Postgres full-text search or a dedicated search index (see README roadmap).
    """
    stmt = select(Chunk).join(Document).where(Document.status == DocumentStatus.READY)
    if document_id is not None:
        stmt = stmt.where(Chunk.document_id == document_id)
    if owner_id is not None:
        stmt = stmt.where(Document.owner_id == owner_id)
    candidates = list(db.scalars(stmt))
    if not candidates:
        return []

    corpus = [_tokenize(chunk.text) for chunk in candidates]
    bm25 = BM25Okapi(corpus)
    scores = bm25.get_scores(_tokenize(query))

    ranked = sorted(zip(candidates, scores), key=lambda pair: pair[1], reverse=True)
    return [chunk for chunk, score in ranked[:top_k] if score > 0]
