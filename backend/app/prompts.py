"""Grounded-answer prompt construction. Pure functions, no DB/LLM I/O, so this is unit-testable
by constructing SourceChunk values directly."""

from dataclasses import dataclass

SYSTEM_PROMPT = (
    "You are a research assistant that answers questions strictly using the numbered source "
    "excerpts provided below. Rules:\n"
    "1. Only use information present in the sources. Never rely on outside knowledge.\n"
    "2. Every claim in your answer must be followed by a citation like [1] or [1,3] referencing "
    "the source excerpt number(s) that support it.\n"
    "3. If the sources do not contain enough information to answer, say so explicitly instead "
    "of guessing.\n"
    "4. Be concise and precise."
)


@dataclass(frozen=True)
class SourceChunk:
    ref_id: int
    document_title: str
    page_number: int | None
    text: str


def format_sources(chunks: list[SourceChunk]) -> str:
    blocks = []
    for chunk in chunks:
        location = f", page {chunk.page_number}" if chunk.page_number is not None else ""
        blocks.append(f"[{chunk.ref_id}] {chunk.document_title}{location}\n{chunk.text}")
    return "\n\n".join(blocks)


def build_user_prompt(question: str, chunks: list[SourceChunk]) -> str:
    if not chunks:
        return f"Question: {question}\n\nNo source excerpts were retrieved for this question."
    return f"Sources:\n\n{format_sources(chunks)}\n\nQuestion: {question}"


def build_prompt(question: str, chunks: list[SourceChunk]) -> tuple[str, str]:
    return SYSTEM_PROMPT, build_user_prompt(question, chunks)
