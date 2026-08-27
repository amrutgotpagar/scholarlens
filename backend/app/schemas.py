import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.db.models import DocumentStatus


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    title: str | None
    status: DocumentStatus
    page_count: int | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    document_id: uuid.UUID | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)


class CitationOut(BaseModel):
    ref_id: int
    document_id: uuid.UUID
    document_title: str
    page_number: int | None
    text: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[CitationOut]
