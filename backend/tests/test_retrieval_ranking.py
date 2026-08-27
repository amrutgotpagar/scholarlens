from app.retrieval.fusion import reciprocal_rank_fusion


def test_fusion_ranks_items_agreed_on_by_both_lists_first():
    vector_ranked = ["a", "b", "c", "d"]
    bm25_ranked = ["b", "a", "d", "c"]

    fused = reciprocal_rank_fusion([vector_ranked, bm25_ranked], top_k=4)
    fused_ids = [c.chunk_id for c in fused]

    # "a" and "b" occupy the top two positions in both lists, so they should fuse to the top,
    # ahead of "c"/"d" which are always ranked lower in both lists.
    assert set(fused_ids[:2]) == {"a", "b"}
    assert set(fused_ids[2:]) == {"c", "d"}


def test_fusion_boosts_items_present_in_both_lists_over_single_list_items():
    vector_ranked = ["x", "shared"]
    bm25_ranked = ["shared", "y"]

    fused = reciprocal_rank_fusion([vector_ranked, bm25_ranked], top_k=3)

    assert fused[0].chunk_id == "shared"
    assert fused[0].score > next(c.score for c in fused if c.chunk_id == "x")


def test_fusion_respects_top_k():
    ranked = [str(i) for i in range(10)]
    fused = reciprocal_rank_fusion([ranked], top_k=3)
    assert len(fused) == 3
    assert [c.chunk_id for c in fused] == ["0", "1", "2"]


def test_fusion_handles_empty_lists():
    assert reciprocal_rank_fusion([[], []], top_k=5) == []


def test_fusion_handles_disjoint_lists():
    fused = reciprocal_rank_fusion([["a"], ["b"]], top_k=5)
    assert {c.chunk_id for c in fused} == {"a", "b"}
    # both are top-of-list in their own retriever, so RRF scores them equally
    assert fused[0].score == fused[1].score
