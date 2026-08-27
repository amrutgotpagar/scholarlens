import pytest

from app.ingestion.chunking import PageText, chunk_page, chunk_pages


def test_chunk_page_no_overlap_splits_evenly():
    text = " ".join(f"word{i}" for i in range(10))
    chunks = chunk_page(text, chunk_size=5, chunk_overlap=0)
    assert chunks == ["word0 word1 word2 word3 word4", "word5 word6 word7 word8 word9"]


def test_chunk_page_overlap_repeats_trailing_words():
    text = " ".join(f"w{i}" for i in range(10))
    chunks = chunk_page(text, chunk_size=4, chunk_overlap=2)
    # stride = 2, windows start at 0, 2, 4, 6, 8
    assert chunks[0] == "w0 w1 w2 w3"
    assert chunks[1] == "w2 w3 w4 w5"
    assert chunks[-1].split()[0] in chunks[-2].split()  # consecutive chunks overlap


def test_chunk_page_shorter_than_chunk_size_returns_single_chunk():
    assert chunk_page("only a few words", chunk_size=50, chunk_overlap=5) == ["only a few words"]


def test_chunk_page_empty_text_returns_no_chunks():
    assert chunk_page("   ", chunk_size=10, chunk_overlap=2) == []


def test_chunk_page_rejects_invalid_overlap():
    with pytest.raises(ValueError):
        chunk_page("some text here", chunk_size=5, chunk_overlap=5)
    with pytest.raises(ValueError):
        chunk_page("some text here", chunk_size=5, chunk_overlap=-1)


def test_chunk_page_rejects_non_positive_chunk_size():
    with pytest.raises(ValueError):
        chunk_page("some text", chunk_size=0, chunk_overlap=0)


def test_chunk_pages_preserves_page_numbers_and_reindexes_globally():
    pages = [
        PageText(page_number=1, text=" ".join(f"a{i}" for i in range(6))),
        PageText(page_number=2, text=" ".join(f"b{i}" for i in range(6))),
    ]
    chunks = chunk_pages(pages, chunk_size=3, chunk_overlap=0)

    assert [c.page_number for c in chunks] == [1, 1, 2, 2]
    assert [c.chunk_index for c in chunks] == [0, 1, 2, 3]
    assert chunks[0].text == "a0 a1 a2"
    assert chunks[2].text == "b0 b1 b2"


def test_chunk_pages_skips_pages_with_no_text():
    pages = [PageText(page_number=1, text=""), PageText(page_number=2, text="only content here")]
    chunks = chunk_pages(pages, chunk_size=10, chunk_overlap=0)
    assert len(chunks) == 1
    assert chunks[0].page_number == 2
