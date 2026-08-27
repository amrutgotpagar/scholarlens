from app.prompts import SourceChunk, build_prompt, build_user_prompt, format_sources


def _chunk(ref_id=1, title="Attention Is All You Need", page=3, text="Transformers use self-attention."):
    return SourceChunk(ref_id=ref_id, document_title=title, page_number=page, text=text)


def test_format_sources_includes_ref_id_title_and_page():
    rendered = format_sources([_chunk()])
    assert "[1] Attention Is All You Need, page 3" in rendered
    assert "Transformers use self-attention." in rendered


def test_format_sources_omits_page_when_none():
    rendered = format_sources([_chunk(page=None)])
    assert "[1] Attention Is All You Need\n" in rendered
    assert "page" not in rendered.split("\n")[0]


def test_build_user_prompt_includes_question_and_sources():
    prompt = build_user_prompt("What mechanism replaces recurrence?", [_chunk()])
    assert "What mechanism replaces recurrence?" in prompt
    assert "[1] Attention Is All You Need" in prompt


def test_build_user_prompt_handles_no_retrieved_chunks():
    prompt = build_user_prompt("Unanswerable question", [])
    assert "No source excerpts were retrieved" in prompt


def test_build_prompt_system_prompt_requires_citations_and_grounding():
    system_prompt, _ = build_prompt("q", [_chunk()])
    assert "citation" in system_prompt.lower()
    assert "only use information present in the sources" in system_prompt.lower()


def test_build_prompt_multiple_sources_all_present_in_user_prompt():
    chunks = [_chunk(ref_id=1, title="Doc A"), _chunk(ref_id=2, title="Doc B", page=7)]
    _, user_prompt = build_prompt("compare A and B", chunks)
    assert "[1] Doc A" in user_prompt
    assert "[2] Doc B, page 7" in user_prompt
