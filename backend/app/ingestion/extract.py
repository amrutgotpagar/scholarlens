from io import BytesIO

import pdfplumber

from app.ingestion.chunking import PageText


class ExtractionError(Exception):
    pass


def extract_pages(pdf_bytes: bytes) -> list[PageText]:
    """Extract per-page text from a PDF. Pages with no extractable text are skipped."""
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            pages: list[PageText] = []
            for i, page in enumerate(pdf.pages, start=1):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(PageText(page_number=i, text=text))
            return pages
    except Exception as exc:  # pdfplumber/pdfminer raise various low-level errors on malformed PDFs
        raise ExtractionError(f"Could not parse PDF: {exc}") from exc
