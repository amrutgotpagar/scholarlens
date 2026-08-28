import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Chunk, Document, DocumentStatus
from app.db.session import get_db
from app.dependencies import get_embedding_provider
from app.ingestion.chunking import chunk_pages
from app.ingestion.extract import ExtractionError, extract_pages
from app.llm.base import EmbeddingProvider
from app.schemas import DocumentOut, PresignUploadRequest, PresignUploadResponse
from app.storage import s3

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()

PDF_MAGIC_BYTES = b"%PDF-"


@router.post("/presign", response_model=PresignUploadResponse)
def presign_upload(request: PresignUploadRequest, db: Session = Depends(get_db)) -> PresignUploadResponse:
    """Step 1 of 3: issue an S3 presigned POST. The browser uploads straight to S3 next —
    raw bytes never touch this backend. See POST /{document_id}/finalize for step 3."""
    if request.content_type not in settings.allowed_upload_content_types:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {request.content_type}")

    document_id = uuid.uuid4()
    object_key = s3.build_object_key(document_id)

    document = Document(
        id=document_id,
        filename=request.filename,
        title=request.filename,
        content_type=request.content_type,
        byte_size=0,  # unknown until the upload lands in S3 — set for real in /finalize
        status=DocumentStatus.PENDING,
        s3_key=object_key,
    )
    db.add(document)
    db.commit()

    presigned = s3.create_presigned_upload(object_key, request.content_type)
    return PresignUploadResponse(
        document_id=document_id,
        upload_url=presigned["url"],
        upload_fields=presigned["fields"],
    )


@router.post("/{document_id}/finalize", response_model=DocumentOut)
def finalize_upload(
    document_id: str,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
) -> Document:
    """Step 3 of 3: called by the client once its direct-to-S3 upload (step 2) has
    completed. Fetches the object from S3 exactly once, validates it's genuinely a PDF
    (the presigned POST already constrained size/declared-type at the S3 layer, but a
    client could still lie about content type — real bytes are checked here), and runs
    the same extract/chunk/embed pipeline the old direct-upload endpoint used to run
    inline."""
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status != DocumentStatus.PENDING:
        return document  # already finalized (or in flight) — idempotent on retry/double-click

    document.status = DocumentStatus.PROCESSING
    db.commit()

    if not s3.object_exists(document.s3_key):
        document.status = DocumentStatus.FAILED
        document.error_message = "Upload not found in S3 — the presigned URL may have expired."
        db.commit()
        db.refresh(document)
        return document

    try:
        body = s3.download_object(document.s3_key)

        if not body.startswith(PDF_MAGIC_BYTES):
            raise ExtractionError("File does not appear to be a valid PDF")

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

        document.byte_size = len(body)
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
        s3.delete_object(document.s3_key)  # don't keep paying to store a file we rejected
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


@router.get("/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)) -> RedirectResponse:
    """Redirects to a fresh presigned GET URL rather than proxying bytes — downloads never
    route through the backend either, symmetric with the upload path."""
    document = db.get(Document, document_id)
    if document is None or document.status != DocumentStatus.READY:
        raise HTTPException(status_code=404, detail="File not found")
    url = s3.create_presigned_download(document.s3_key)
    return RedirectResponse(url=url, status_code=307)
