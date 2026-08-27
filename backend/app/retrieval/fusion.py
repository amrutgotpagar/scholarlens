"""Reciprocal Rank Fusion: combine ranked candidate lists from independent retrievers.

RRF is used (over e.g. weighted score averaging) because vector cosine similarity and
BM25 scores live on different, incomparable scales — RRF only needs each retriever's
*rank order*, not its raw scores, so no normalization step is needed.
"""

from dataclasses import dataclass

RRF_K = 60


@dataclass(frozen=True)
class RankedCandidate:
    chunk_id: str
    score: float


def reciprocal_rank_fusion(
    ranked_lists: list[list[str]],
    top_k: int,
    k: int = RRF_K,
) -> list[RankedCandidate]:
    """Fuse multiple ranked lists of chunk_ids (each best-first) into one ranking.

    fused_score(chunk) = sum over lists containing chunk of 1 / (k + rank_in_that_list)
    """
    scores: dict[str, float] = {}
    for ranked_list in ranked_lists:
        for rank, chunk_id in enumerate(ranked_list):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank + 1)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [RankedCandidate(chunk_id=chunk_id, score=score) for chunk_id, score in ranked[:top_k]]
