import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.models import Chunk
from app.db.session import get_db
from app.dependencies import get_embedding_provider, get_generation_provider
from app.llm.base import EmbeddingProvider, GenerationProvider
from app.prompts import SourceChunk, build_prompt
from app.retrieval.pipeline import hybrid_retrieve, vector_only_retrieve
from app.schemas import CitationOut, QueryRequest, QueryResponse

router = APIRouter(prefix="/query", tags=["query"])
logger = logging.getLogger("app.query")


def _retrieve(
    db: Session,
    embedding_provider: EmbeddingProvider,
    request: QueryRequest,
) -> tuple[str, str, list[CitationOut]]:
    """Run retrieval + prompt construction, shared by the sync and streaming endpoints."""
    retrieve = hybrid_retrieve if request.retrieval_mode == "hybrid" else vector_only_retrieve
    chunks: list[Chunk] = retrieve(
        db=db,
        embedding_provider=embedding_provider,
        query=request.question,
        document_id=request.document_id,
        top_k=request.top_k,
    )

    source_chunks = [
        SourceChunk(
            ref_id=i + 1,
            document_title=chunk.document.title or chunk.document.filename,
            page_number=chunk.page_number,
            text=chunk.text,
        )
        for i, chunk in enumerate(chunks)
    ]

    system_prompt, user_prompt = build_prompt(request.question, source_chunks)

    citations = [
        CitationOut(
            ref_id=source.ref_id,
            document_id=chunk.document_id,
            document_title=source.document_title,
            page_number=source.page_number,
            text=source.text,
        )
        for source, chunk in zip(source_chunks, chunks)
    ]

    return system_prompt, user_prompt, citations


@router.post("", response_model=QueryResponse)
def query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
    generation_provider: GenerationProvider = Depends(get_generation_provider),
) -> QueryResponse:
    system_prompt, user_prompt, citations = _retrieve(db, embedding_provider, request)
    answer = generation_provider.generate(system_prompt, user_prompt)
    return QueryResponse(answer=answer, citations=citations)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/stream")
def query_stream(
    request: QueryRequest,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
    generation_provider: GenerationProvider = Depends(get_generation_provider),
) -> StreamingResponse:
    # Retrieval happens before the StreamingResponse is constructed, so a failure here
    # (DB down, embedding call fails) still produces a normal JSON error response — only
    # generation failures, which happen after headers are sent, need the SSE "error" event.
    system_prompt, user_prompt, citations = _retrieve(db, embedding_provider, request)

    def event_stream():
        yield _sse("citations", {"citations": [c.model_dump(mode="json") for c in citations]})
        try:
            for delta in generation_provider.stream_generate(system_prompt, user_prompt):
                yield _sse("token", {"text": delta})
        except Exception:
            logger.exception("Streamed generation failed")
            yield _sse("error", {"detail": "Answer generation failed"})
            return
        yield _sse("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
