import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.db.models import DocumentStatus, FeedbackRating


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
    # Exposed for the Phase 3 eval harness to compare configs (see eval/run_eval.py); the
    # frontend never sets this and always gets the default hybrid behavior.
    retrieval_mode: Literal["hybrid", "vector_only"] = "hybrid"


class CitationOut(BaseModel):
    ref_id: int
    document_id: uuid.UUID
    document_title: str
    page_number: int | None
    text: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[CitationOut]


class FeedbackCreate(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=20000)
    rating: FeedbackRating
    document_id: uuid.UUID | None = None


class FeedbackOut(BaseModel):
    id: uuid.UUID
    rating: FeedbackRating
    created_at: datetime

    model_config = {"from_attributes": True}
