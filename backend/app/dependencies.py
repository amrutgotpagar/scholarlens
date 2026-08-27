from functools import lru_cache

from app.config import get_settings
from app.llm.base import EmbeddingProvider, GenerationProvider
from app.llm.ollama_provider import OllamaEmbeddingProvider, OllamaGenerationProvider
from app.llm.openai_provider import OpenAIEmbeddingProvider, OpenAIGenerationProvider

settings = get_settings()


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    if settings.llm_provider == "ollama":
        return OllamaEmbeddingProvider()
    return OpenAIEmbeddingProvider()


@lru_cache
def get_generation_provider() -> GenerationProvider:
    if settings.llm_provider == "ollama":
        return OllamaGenerationProvider()
    return OpenAIGenerationProvider()
