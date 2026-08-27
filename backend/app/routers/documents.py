from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Chunk, Document, DocumentStatus
from app.db.session import get_db
from app.dependencies import get_embedding_provider
from app.ingestion.chunking import chunk_pages
from app.ingestion.extract import ExtractionError, extract_pages
from app.llm.base import EmbeddingProvider
from app.schemas import DocumentOut

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


@router.post("", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
) -> Document:
    if file.content_type not in settings.allowed_upload_content_types:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {file.content_type}")

    body = file.file.read()
    if len(body) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds maximum upload size")
    if not body:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    document = Document(
        filename=file.filename or "untitled.pdf",
        title=file.filename,
        content_type=file.content_type,
        byte_size=len(body),
        status=DocumentStatus.PROCESSING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        pages = extract_pages(body)
        if not pages:
            raise ExtractionError("No extractable text found in PDF")

        text_chunks = chunk_pages(pages, settings.chunk_size, settings.chunk_overlap)
        if not text_chunks:
            raise ExtractionError("Document produced no chunks after extraction")

        embeddings = embedding_provider.embed([c.text for c in text_chunks])

        for text_chunk, embedding in zip(text_chunks, embeddings):
            db.add(
                Chunk(
                    document_id=document.id,
                    chunk_index=text_chunk.chunk_index,
                    page_number=text_chunk.page_number,
                    text=text_chunk.text,
                    token_count=text_chunk.word_count,
                    embedding=embedding,
                )
            )

        document.page_count = len(pages)
        document.status = DocumentStatus.READY
        db.commit()
        db.refresh(document)
    except ExtractionError as exc:
        db.rollback()
        document.status = DocumentStatus.FAILED
        document.error_message = str(exc)
        db.add(document)
        db.commit()
        db.refresh(document)
    except Exception as exc:  # embedding/API failures, etc. — never leak a raw stack trace to the client
        db.rollback()
        document.status = DocumentStatus.FAILED
        document.error_message = "Failed to process document"
        db.add(document)
        db.commit()
        db.refresh(document)
        raise HTTPException(status_code=502, detail="Failed to process document") from exc

    return document


@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)) -> list[Document]:
    return list(db.query(Document).order_by(Document.created_at.desc()).all())


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document
