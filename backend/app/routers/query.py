from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_embedding_provider, get_generation_provider
from app.llm.base import EmbeddingProvider, GenerationProvider
from app.prompts import SourceChunk, build_prompt
from app.retrieval.pipeline import hybrid_retrieve
from app.schemas import CitationOut, QueryRequest, QueryResponse

router = APIRouter(prefix="/query", tags=["query"])


@router.post("", response_model=QueryResponse)
def query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
    generation_provider: GenerationProvider = Depends(get_generation_provider),
) -> QueryResponse:
    chunks = hybrid_retrieve(
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
    answer = generation_provider.generate(system_prompt, user_prompt)

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

    return QueryResponse(answer=answer, citations=citations)
