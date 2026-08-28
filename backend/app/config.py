from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://rag:rag@localhost:5432/rag"

    # "openai" (default, matches the spec'd stack), "ollama" (free local inference), or "nvidia"
    # (NVIDIA NIM's hosted OpenAI-compatible API, free developer credits). All three implement
    # the same EmbeddingProvider/GenerationProvider interface, so nothing outside app/llm/ and
    # app/dependencies.py needs to know which is active.
    llm_provider: str = "openai"

    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    generation_model: str = "gpt-4o-mini"

    ollama_base_url: str = "http://ollama:11434/v1"
    ollama_embedding_model: str = "nomic-embed-text"
    ollama_embedding_dim: int = 768
    ollama_generation_model: str = "llama3.2:1b"

    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    # nv-embedqa-e5-v5 (an earlier NIM embedding model) is deprecated on NVIDIA's hosted API
    # as of this build; nemotron-3-embed-1b is the current active replacement. Verified live
    # against the real endpoint: 2048-dim output, same input_type query/passage convention.
    nvidia_embedding_model: str = "nvidia/nemotron-3-embed-1b"
    nvidia_embedding_dim: int = 2048
    nvidia_generation_model: str = "nvidia/nemotron-3-ultra-550b-a55b"

    chunk_size: int = 800
    chunk_overlap: int = 150

    retrieval_top_k: int = 8
    vector_candidate_k: int = 25
    bm25_candidate_k: int = 25

    max_upload_bytes: int = 25 * 1024 * 1024
    allowed_upload_content_types: tuple[str, ...] = ("application/pdf",)

    # The frontend's actual dev-server origin varies by machine (Vite's default 5173 is
    # frequently already taken, landing on a different port) — set via env rather than
    # hardcoding one guess. Locked to explicit origin(s), never "*", even in dev.
    cors_allow_origins: tuple[str, ...] = ("http://localhost:5173", "http://localhost:5180")

    aws_region: str = "eu-north-1"
    s3_bucket_name: str = ""
    # How long a presigned upload/download URL stays valid for.
    presigned_upload_expires_seconds: int = 300
    presigned_download_expires_seconds: int = 300

    # Per-client-IP, in-memory (see app/middleware.py for why IP rather than user).
    rate_limit_requests: int = 30
    rate_limit_window_seconds: float = 60.0

    # Supabase Auth. The JWT secret verifies the access token the frontend attaches
    # to every request (see app/auth.py) — it's a shared HMAC secret, not the anon
    # key, and lives only server-side. Project Settings -> API -> JWT Secret.
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    @property
    def active_embedding_dim(self) -> int:
        """The pgvector column width to use, based on whichever provider is active.
        Read by both the ORM model and the initial migration so the schema always
        matches LLM_PROVIDER. Changing LLM_PROVIDER after the schema is created
        requires a new migration to alter the column width."""
        return {
            "openai": self.embedding_dim,
            "ollama": self.ollama_embedding_dim,
            "nvidia": self.nvidia_embedding_dim,
        }[self.llm_provider]


@lru_cache
def get_settings() -> Settings:
    return Settings()
