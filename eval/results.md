# Eval results

Dataset: 29 hand-written question/answer pairs across 4 papers (Attention Is All You Need, BERT, Deep Residual Learning, Generative Adversarial Nets), including 3 cross-document questions with no `document_id` scope.

Provider: `nvidia` (generation: `nvidia/nemotron-3-ultra-550b-a55b`). Retrieval precision counts a hit when the expected document/page (±1) appears anywhere in the returned citations. Answer accuracy is scored by an LLM judge (same generation provider) comparing each answer against the hand-written reference. Cost is real $ only under `LLM_PROVIDER=openai`; it's genuinely $0 for the local/free providers, not an omission.

| Config | Retrieval precision | Answer accuracy | Avg latency | p95 latency | Avg cost/query | Total cost |
|---|---|---|---|---|---|---|
| hybrid | 100% (29 q) | 97% (28/29)\* | 32.07s | 79.48s | $0.00000 | $0.0000 |
| vector_only | 100% (29 q) | 97% (28/29)\* | 17.22s | 48.48s | $0.00000 | $0.0000 |

\* The one miss in each run (`attn-7`) was a bug in this eval's own reference answer, not
a system error. The paper's abstract quotes "3.5 days on eight GPUs" for its best result,
but that figure is for the **big** model variant; `attn-7` asks specifically about the
**base** model, whose real training time — 12 hours (100,000 steps), per the Hardware and
Schedule section on page 7 — is a different number. The system answered "8 NVIDIA P100
GPUs for 12 hours (100,000 training steps)," correctly cited to page 7, and the LLM judge
correctly flagged it as inconsistent with the (wrong) reference answer of "3.5 days" that
was in the dataset at the time. Verified by re-querying both configs directly after the
run; the dataset has since been corrected (`eval/dataset.json`, `attn-7`). Manually
confirmed true answer accuracy is **100% (29/29)** for both configs — not re-run through
the full harness again given the ~35–90 min wall-clock cost of NVIDIA's free-tier model at
current load, but the corrected reference answer is now in place for future runs.

**Retrieval precision tied at 100% for both configs** on this dataset — these are direct
factual lookups against short, topically distinct papers, well within reach of embedding
similarity alone, so hybrid's BM25 leg didn't have a precision gap to close here. That's a
genuine result, not a wash: it says hybrid isn't *hurting* anything, and BM25's real value
(exact term/number matches embeddings can miss) would show up on queries harder to phrase
semantically than these — something to probe with adversarial/paraphrased queries in a
future eval pass, per the roadmap.

**Hybrid's ~1.9x higher average latency is very likely LLM-generation variance, not
retrieval cost.** In-memory BM25 over a few dozen chunks is single-digit milliseconds;
the two runs' per-query latencies span roughly 4–82s and were driven almost entirely by
NVIDIA's free-tier model load at the time each request landed (visible directly in the
per-question log — e.g. `bert-2` took 81.6s in the hybrid run but a much more typical
12.7s in the vector-only run for the same question). Attributing the latency gap to the
retrieval algorithm itself would overstate BM25's cost.
