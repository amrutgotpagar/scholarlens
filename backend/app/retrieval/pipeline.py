import uuid

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Chunk
from app.llm.base import EmbeddingProvider
from app.retrieval.bm25_search import bm25_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.vector_search import vector_search

settings = get_settings()


def hybrid_retrieve(
    db: Session,
    embedding_provider: EmbeddingProvider,
    query: str,
    document_id: uuid.UUID | None = None,
    top_k: int | None = None,
    owner_id: str | None = None,
) -> list[Chunk]:
    """Embed the query, run vector + BM25 search in parallel candidate pools, and fuse them."""
    top_k = top_k or settings.retrieval_top_k

    query_embedding = embedding_provider.embed_query(query)
    vector_hits = vector_search(db, query_embedding, settings.vector_candidate_k, document_id, owner_id)
    bm25_hits = bm25_search(db, query, settings.bm25_candidate_k, document_id, owner_id)

    chunk_map = {str(c.id): c for c in [*vector_hits, *bm25_hits]}
    fused = reciprocal_rank_fusion(
        ranked_lists=[[str(c.id) for c in vector_hits], [str(c.id) for c in bm25_hits]],
        top_k=top_k,
    )
    return [chunk_map[candidate.chunk_id] for candidate in fused]


def vector_only_retrieve(
    db: Session,
    embedding_provider: EmbeddingProvider,
    query: str,
    document_id: uuid.UUID | None = None,
    top_k: int | None = None,
    owner_id: str | None = None,
) -> list[Chunk]:
    """Vector-similarity-only retrieval, kept for the Phase 3 eval comparison (vector-only vs hybrid)."""
    top_k = top_k or settings.retrieval_top_k
    query_embedding = embedding_provider.embed_query(query)
    return vector_search(db, query_embedding, top_k, document_id, owner_id)
