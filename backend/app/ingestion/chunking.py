"""Word-based sliding-window chunking with overlap.

Chunk/overlap sizes are expressed in whitespace-delimited words rather than
model tokens. This keeps chunking a pure, offline, deterministic function —
no tokenizer vocab to download or keep in sync with the embedding model.
Word count is a reasonable proxy for token count in English prose (roughly
0.75 tokens/word), and the embedding client is responsible for truncating
any chunk that ends up over the model's actual token limit.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PageText:
    page_number: int
    text: str


@dataclass(frozen=True)
class TextChunk:
    chunk_index: int
    page_number: int | None
    text: str
    word_count: int


def chunk_page(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split a single page's text into overlapping word-window chunks."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be >= 0 and < chunk_size")

    words = text.split()
    if not words:
        return []

    stride = chunk_size - chunk_overlap
    chunks: list[str] = []
    start = 0
    while start < len(words):
        window = words[start : start + chunk_size]
        chunks.append(" ".join(window))
        if start + chunk_size >= len(words):
            break
        start += stride
    return chunks


def chunk_pages(pages: list[PageText], chunk_size: int, chunk_overlap: int) -> list[TextChunk]:
    """Chunk each page independently so every chunk keeps a single page number for citations."""
    result: list[TextChunk] = []
    index = 0
    for page in pages:
        for chunk_text in chunk_page(page.text, chunk_size, chunk_overlap):
            result.append(
                TextChunk(
                    chunk_index=index,
                    page_number=page.page_number,
                    text=chunk_text,
                    word_count=len(chunk_text.split()),
                )
            )
            index += 1
    return result
