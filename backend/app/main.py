from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.exception_handlers import register_exception_handlers
from app.logging_config import configure_logging
from app.middleware import RateLimitMiddleware, RequestContextMiddleware
from app.routers import documents, feedback, query

configure_logging()

settings = get_settings()

app = FastAPI(title="arXiv RAG Q&A", version="0.1.0")

register_exception_handlers(app)

app.add_middleware(
    RateLimitMiddleware,
    requests_per_window=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
    exempt_paths={"/api/health"},
)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Everything lives under /api — Vercel's production rewrite (infra: root vercel.json)
# forwards /api/* to this service with the prefix intact rather than stripping it, so
# the dev proxy (vite.config.ts) mirrors that instead of rewriting it away; the two
# environments would otherwise disagree on where routes live.
api = APIRouter(prefix="/api")
api.include_router(documents.router)
api.include_router(query.router)
api.include_router(feedback.router)


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)
