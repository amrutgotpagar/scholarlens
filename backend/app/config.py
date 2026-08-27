from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://rag:rag@localhost:5432/rag"

    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    generation_model: str = "gpt-4o-mini"

    chunk_size: int = 800
    chunk_overlap: int = 150

    retrieval_top_k: int = 8
    vector_candidate_k: int = 25
    bm25_candidate_k: int = 25

    max_upload_bytes: int = 25 * 1024 * 1024
    allowed_upload_content_types: tuple[str, ...] = ("application/pdf",)

    cors_allow_origins: tuple[str, ...] = ("http://localhost:5173",)


@lru_cache
def get_settings() -> Settings:
    return Settings()
