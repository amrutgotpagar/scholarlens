# ScholarLens

A RAG Q&A assistant over arXiv papers: upload a PDF, ask questions, get answers grounded in the paper with page-level citations.

**Live demo:** [scholarlens-murex.vercel.app](https://scholarlens-murex.vercel.app) — backend on Render, Postgres/pgvector on Supabase.

```
┌─────────────┐      ┌──────────────────┐      ┌───────────────────────┐
│   Browser    │──────▶│  Vercel (React)  │──────▶│  Render (FastAPI)     │
│              │◀──────│  static + /api/* │◀──────│  ingestion · retrieval│
└─────────────┘  SSE  │  proxy rewrite   │      │  · generation         │
                       └──────────────────┘      └───────┬───────┬───────┘
                                                          │       │
                                            ┌─────────────▼─┐   ┌─▼──────────────┐
                                            │ Supabase       │   │ AWS S3          │
                                            │ Postgres+pgvec │   │ presigned PDFs  │
                                            │ + Auth (JWT)   │   └─────────────────┘
                                            └────────────────┘
                                                     │
                                     ┌───────────────┴───────────────┐
                                     ▼                               ▼
                              OpenAI / Ollama / NVIDIA NIM     (swappable LLM provider)
```

`infra/` holds a second, parallel architecture — the full AWS target from the original spec (VPC, ECS Fargate, RDS, ALB, ECR, CloudFront) — written and `terraform validate`-clean, but **never applied**. See [Infra & deployment](#infra--deployment-aws) below for why.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Frontend | React 19 + TypeScript + Tailwind CSS + Vite |
| Vector store | Postgres + pgvector (Supabase) |
| Relational data | Same Postgres instance (documents, chunks, feedback) |
| Auth | Supabase Auth (JWT, HS256 or ES256/JWKS depending on project) |
| LLM | OpenAI (`gpt-4o-mini` / `text-embedding-3-small`), or Ollama / NVIDIA NIM as free swap-ins |
| File storage | AWS S3, presigned URLs (uploads never route through the backend) |
| Containerization | Docker (multi-stage) + docker-compose for local dev |
| IaC | Terraform (`infra/`) — portfolio target, not the live deployment |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Testing | pytest (backend) |

## Key engineering decisions

**pgvector over a dedicated vector DB.** The app already needs Postgres for users, documents, and feedback — adding pgvector to that same instance means one database to run and pay for instead of two, at a scale (a few thousand chunks) where a dedicated vector store's extra throughput isn't needed.

**Hybrid retrieval (vector + BM25 fusion), not vector-only.** Embedding similarity misses exact term/number matches — a paper's exact hyperparameter or model name can rank below a semantically-similar-but-wrong chunk. BM25 catches those. The [Phase 3 eval](eval/results.md) found no precision gap between the two on its current dataset (short, topically distinct papers, easy for embeddings alone) — a real result, reported as-is rather than overstated, with the honest caveat that BM25's value would show up more on harder, paraphrased queries.

**A provider-swappable LLM interface, not just an OpenAI client.** `app/llm/` defines one interface with three implementations (OpenAI, local Ollama, NVIDIA NIM's free tier). This isn't hypothetical flexibility — it's what let the entire pipeline, including the full Phase 3 eval run, execute for genuinely $0 during development, with OpenAI as the drop-in for production quality.

**JWT verification keyed off the token's own `alg` header, not a config flag.** Supabase signs access tokens either with a shared HS256 secret (older projects) or per-project ES256/RS256 keys served over JWKS (newer projects). Reading `alg` from the unverified header and branching there means the same backend code works against either generation of Supabase project with zero environment-specific configuration.

## Evaluation

29 hand-written Q&A pairs across 4 papers (*Attention Is All You Need*, BERT, ResNet, GANs), run through both a hybrid and a vector-only config. Full methodology and caveats in [eval/results.md](eval/results.md).

| Config | Retrieval precision | Answer accuracy | Avg latency | Avg cost/query |
|---|---|---|---|---|
| Hybrid | 100% (29/29) | 100%\* | 32.1s | $0.00 |
| Vector-only | 100% (29/29) | 100%\* | 17.2s | $0.00 |

\* Run under the free NVIDIA NIM provider — $0 cost is real, not omitted. One in-run miss on each config traced back to an error in the eval's own reference answer (not the system); see the linked write-up. Latency reflects free-tier model load at request time, not the retrieval algorithm.

## Estimated cost at 1,000 requests/day

Two different numbers, because two different stacks exist:

**Actual live deployment (Render + Vercel + Supabase, free tiers): ~$0/month.** This is what's really running today.

**If cut over to the `infra/` AWS stack, with OpenAI as the LLM provider (estimate, not measured):**

| Item | Est. monthly cost |
|---|---|
| ECS Fargate (0.5 vCPU / 1 GB, 1 task, 24/7) | ~$20 |
| NAT Gateway (single, shared) | ~$33 |
| Application Load Balancer | ~$18 |
| RDS `db.t4g.micro` + 20 GB gp3 | ~$14 |
| S3 + CloudFront + ECR + Secrets Manager | ~$4 |
| **AWS infra subtotal** | **~$89/mo** |
| OpenAI (`gpt-4o-mini`, ~6.6k input + 300 output tokens/query × 1,000/day) | ~$36 |
| **Total** | **~$125/mo** |

The NAT Gateway and ALB are fixed costs that don't scale down with traffic — at 1,000 req/day they dominate the bill more than compute does. That floor cost is exactly why the live demo runs on Render/Vercel instead: at this traffic level, the AWS architecture is the right one to have *written* for the portfolio story, not the right one to actually be *paying for*.

## Local setup

```bash
git clone https://github.com/amrutgotpagar/scholarlens.git
cd scholarlens
cp backend/.env.example backend/.env   # fill in at least one LLM provider's keys
docker-compose up
```

This starts Postgres+pgvector, a local Ollama instance (free, no key needed — set `LLM_PROVIDER=ollama` to use it), and the backend on `:8000`. For the frontend:

```bash
cd frontend
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Infra & deployment (AWS)

`infra/` is a complete Terraform implementation of the original spec's target architecture — VPC, RDS, ECS Fargate, ALB, ECR, S3+CloudFront, Secrets Manager — written to demonstrate the IaC skill, `terraform validate`-clean, but **deliberately never `apply`'d**: the live app already runs for free on Supabase/Render/Vercel, and standing up the AWS stack for real would cost the ~$89/mo above with no functional benefit at this traffic level.

`.github/workflows/ci.yml` mirrors this same split: lint/test/docker-build run for real on every push and PR. The AWS deploy job (ECR push → ECS force-deploy → smoke test → S3/CloudFront sync) is fully wired but gated behind a repo variable (`AWS_DEPLOY_ENABLED`) that's never set — so it's real, working CI/CD code, but structurally cannot fire or cost anything unless someone deliberately applies the Terraform and turns it on.

To actually stand it up:

```bash
cd infra
terraform init
terraform plan    # review what would be created
terraform apply   # creates real, billable AWS resources
```

## Known limitations

- Rate limiting (Phase 2) is in-memory — resets on restart, doesn't share state across multiple backend instances.
- BM25 is rebuilt in-memory per query; fine at the current corpus size, would need a persistent index (e.g. OpenSearch) at real scale.
- No frontend test suite — the original spec called for vitest/jest; only backend pytest coverage exists.
- The eval set is small (29 pairs, 4 papers) and didn't surface a precision gap for hybrid retrieval; a larger, paraphrased/adversarial set is needed to actually stress that.
- Render's free tier cold-starts after ~15 min idle (mitigated with an external cron ping to `/api/health`, not a real fix).
- The AWS path has no custom domain or HTTPS wired up (ALB is HTTP-only) since no domain was purchased for the portfolio deployment.

## v2 roadmap

- Larger, adversarial eval set designed to actually surface hybrid retrieval's advantage over vector-only.
- Real frontend test suite (vitest).
- Redis-backed rate limiting for horizontal scaling.
- Either apply the AWS stack for real with a custom domain + ACM cert, or retire it in favor of documenting Render/Vercel as the deliberate choice.
- Document re-upload / versioning instead of delete-and-re-upload.
