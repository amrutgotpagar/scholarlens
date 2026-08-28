"""Phase 3 eval harness.

Uploads the eval corpus (if not already present), runs the hand-written dataset through
both retrieval configs (hybrid vs vector-only) against the live API, scores retrieval
hit-rate and LLM-judged answer correctness, and writes eval/results.md.

This exercises the real, running HTTP API (not the pipeline in-process) so it reflects
what an actual client gets — bring the stack up first: `docker-compose up`.

Run from the backend's own venv, since it imports the app package for settings/judge:
    cd backend && source .venv/bin/activate && python ../eval/run_eval.py
"""

import json
import statistics
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import load_dotenv
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

# A run takes tens of minutes end to end; line-buffer stdout (default is block-buffered
# once it's piped, e.g. through `tee`) so progress is actually visible while it runs
# rather than appearing all at once at exit.
sys.stdout.reconfigure(line_buffering=True)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# pydantic-settings resolves its env_file relative to CWD, which is wrong when this script
# is run from backend/ (per the docstring above) — load the real root .env into os.environ
# explicitly first so get_settings() reflects the same LLM_PROVIDER the live API is using,
# not silently falling back to the openai default with no key configured.
load_dotenv(PROJECT_ROOT / ".env")

from app.config import get_settings  # noqa: E402
from app.dependencies import get_generation_provider  # noqa: E402

API_BASE = "http://localhost:8000"
EVAL_DIR = Path(__file__).resolve().parent
PAPERS_DIR = EVAL_DIR / "papers"
DATASET_PATH = EVAL_DIR / "dataset.json"
RESULTS_PATH = EVAL_DIR / "results.md"
RUN_LOG_PATH = EVAL_DIR / "run_log.json"

PAPER_FILES = {
    "attention": "attention_is_all_you_need.pdf",
    "bert": "bert.pdf",
    "resnet": "resnet.pdf",
    "gan": "gan.pdf",
}

# Only OpenAI's hosted models have a real dollar cost here; Ollama is local (free) and
# NVIDIA NIM's developer tier is $0 for the models this project defaults to. Prices are
# per 1K tokens, current as of this build.
OPENAI_PRICING_PER_1K = {
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
}

JUDGE_SYSTEM_PROMPT = (
    "You are grading whether a candidate answer correctly addresses a question, given a "
    "reference answer. Respond with exactly one word: YES if the candidate answer is "
    "factually consistent with the reference and answers the question, or NO if it is "
    "missing the key fact, contradicts the reference, or fails to answer. Minor wording "
    "differences, extra detail, or citation markers like [1] are fine — judge factual "
    "correctness only."
)

RATE_LIMIT_PAUSE_S = 2.2  # backend default is 30 req/60s; this keeps us comfortably under it


class RateLimited(Exception):
    pass


def _word_count(text: str) -> int:
    return len(text.split())


@dataclass
class QueryResult:
    qa_id: str
    retrieval_mode: str
    question: str
    expected_answer: str
    answer: str
    retrieval_hit: bool
    correct: bool
    latency_s: float
    estimated_cost_usd: float


def load_dataset() -> list[dict]:
    return json.loads(DATASET_PATH.read_text())


def ensure_corpus_uploaded(client: httpx.Client) -> dict[str, str]:
    """Upload each eval paper if it isn't already present (matched by filename), wait for
    it to finish processing, and return {paper_key: document_id}."""
    existing = {d["filename"]: d for d in client.get("/documents").json()}
    document_ids: dict[str, str] = {}

    for paper_key, filename in PAPER_FILES.items():
        doc = existing.get(filename)
        if doc is None:
            print(f"Uploading {filename}...")
            with open(PAPERS_DIR / filename, "rb") as f:
                resp = client.post(
                    "/documents", files={"file": (filename, f, "application/pdf")}, timeout=120
                )
            resp.raise_for_status()
            doc = resp.json()
        else:
            print(f"{filename} already uploaded (status={doc['status']})")

        for _ in range(60):
            if doc["status"] in ("ready", "failed"):
                break
            time.sleep(2)
            doc = client.get(f"/documents/{doc['id']}").json()

        if doc["status"] != "ready":
            raise RuntimeError(f"{filename} did not become ready: {doc.get('error_message')}")

        document_ids[paper_key] = doc["id"]

    return document_ids


@retry(
    retry=retry_if_exception_type(RateLimited),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=2, max=30),
)
def _query_with_retry(client: httpx.Client, payload: dict) -> dict:
    resp = client.post("/query", json=payload, timeout=120)
    if resp.status_code == 429:
        raise RateLimited(resp.text)
    resp.raise_for_status()
    return resp.json()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=20))
def _judge(question: str, expected_answer: str, actual_answer: str) -> bool:
    provider = get_generation_provider()
    user_prompt = (
        f"Question: {question}\n\nReference answer: {expected_answer}\n\n"
        f"Candidate answer: {actual_answer}\n\nYES or NO:"
    )
    verdict = provider.generate(JUDGE_SYSTEM_PROMPT, user_prompt).strip().upper()
    return verdict.startswith("YES")


def _check_retrieval_hit(qa: dict, citations: list[dict], document_ids: dict[str, str]) -> bool:
    expected_paper = qa.get("expected_paper") or qa["paper"]
    expected_document_id = document_ids[expected_paper]
    expected_page = qa["expected_page"]
    return any(
        c["document_id"] == expected_document_id and abs((c["page_number"] or -99) - expected_page) <= 1
        for c in citations
    )


def run_config(
    client: httpx.Client, dataset: list[dict], document_ids: dict[str, str], retrieval_mode: str
) -> list[QueryResult]:
    settings = get_settings()
    pricing = (
        OPENAI_PRICING_PER_1K.get(settings.generation_model) if settings.llm_provider == "openai" else None
    )

    results = []
    for qa in dataset:
        document_id = document_ids[qa["paper"]] if qa["paper"] else None
        payload = {"question": qa["question"], "document_id": document_id, "retrieval_mode": retrieval_mode}

        start = time.perf_counter()
        body = _query_with_retry(client, payload)
        latency_s = time.perf_counter() - start

        answer = body["answer"]
        citations = body["citations"]
        retrieval_hit = _check_retrieval_hit(qa, citations, document_ids)
        correct = _judge(qa["question"], qa["expected_answer"], answer)

        cost = 0.0
        if pricing:
            # Rough token estimate (word count) — same proxy this project's chunking module
            # uses elsewhere — since these API responses don't surface exact token usage.
            cost = (_word_count(qa["question"]) / 1000) * pricing["input"] + (
                _word_count(answer) / 1000
            ) * pricing["output"]

        results.append(
            QueryResult(
                qa_id=qa["id"],
                retrieval_mode=retrieval_mode,
                question=qa["question"],
                expected_answer=qa["expected_answer"],
                answer=answer,
                retrieval_hit=retrieval_hit,
                correct=correct,
                latency_s=latency_s,
                estimated_cost_usd=cost,
            )
        )
        print(
            f"  [{retrieval_mode}] {qa['id']}: hit={retrieval_hit} correct={correct} latency={latency_s:.2f}s",
            flush=True,
        )

        time.sleep(RATE_LIMIT_PAUSE_S)

    return results


def summarize(results: list[QueryResult]) -> dict:
    n = len(results)
    return {
        "n": n,
        "retrieval_precision": sum(r.retrieval_hit for r in results) / n,
        "answer_accuracy": sum(r.correct for r in results) / n,
        "avg_latency_s": statistics.mean(r.latency_s for r in results),
        "p95_latency_s": statistics.quantiles([r.latency_s for r in results], n=20)[18] if n >= 20 else max(r.latency_s for r in results),
        "total_cost_usd": sum(r.estimated_cost_usd for r in results),
        "avg_cost_usd": statistics.mean(r.estimated_cost_usd for r in results),
    }


def write_results_md(dataset: list[dict], summaries: dict[str, dict], settings) -> None:
    lines = [
        "# Eval results",
        "",
        f"Dataset: {len(dataset)} hand-written question/answer pairs across 4 papers "
        "(Attention Is All You Need, BERT, Deep Residual Learning, Generative Adversarial Nets), "
        "including 3 cross-document questions with no `document_id` scope.",
        "",
        f"Provider: `{settings.llm_provider}` "
        f"(generation: `{getattr(settings, f'{settings.llm_provider}_generation_model', settings.generation_model)}`)."
        " Retrieval precision counts a hit when the expected document/page (±1) appears anywhere in the "
        "returned citations. Answer accuracy is scored by an LLM judge (same generation provider) comparing "
        "each answer against the hand-written reference. Cost is real $ only under `LLM_PROVIDER=openai`; "
        "it's genuinely $0 for the local/free providers, not an omission.",
        "",
        "| Config | Retrieval precision | Answer accuracy | Avg latency | p95 latency | Avg cost/query | Total cost |",
        "|---|---|---|---|---|---|---|",
    ]
    for config, s in summaries.items():
        lines.append(
            f"| {config} | {s['retrieval_precision']:.0%} ({s['n']} q) | {s['answer_accuracy']:.0%} "
            f"| {s['avg_latency_s']:.2f}s | {s['p95_latency_s']:.2f}s | ${s['avg_cost_usd']:.5f} "
            f"| ${s['total_cost_usd']:.4f} |"
        )
    RESULTS_PATH.write_text("\n".join(lines) + "\n")
    print(f"\nWrote {RESULTS_PATH}")


def write_run_log(all_results: list[QueryResult]) -> None:
    """Full per-question detail (question/expected/actual answer, hit, correct, latency) for
    every run — the aggregate table in results.md can't show *why* a question missed; this
    is what you'd grep through to find out, rather than needing to manually re-query later."""
    RUN_LOG_PATH.write_text(
        json.dumps([r.__dict__ for r in all_results], indent=2) + "\n"
    )
    print(f"Wrote {RUN_LOG_PATH}")


def main() -> None:
    settings = get_settings()
    dataset = load_dataset()

    with httpx.Client(base_url=API_BASE) as client:
        health = client.get("/health", timeout=10)
        health.raise_for_status()

        document_ids = ensure_corpus_uploaded(client)

        summaries = {}
        all_results: list[QueryResult] = []
        for retrieval_mode in ["hybrid", "vector_only"]:
            print(f"\n=== Running config: {retrieval_mode} ===")
            results = run_config(client, dataset, document_ids, retrieval_mode)
            summaries[retrieval_mode] = summarize(results)
            all_results.extend(results)

    write_run_log(all_results)
    write_results_md(dataset, summaries, settings)
    for config, s in summaries.items():
        print(f"\n{config}: {json.dumps(s, indent=2)}")


if __name__ == "__main__":
    main()
