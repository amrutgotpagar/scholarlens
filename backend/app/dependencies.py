from functools import lru_cache

from app.llm.base import EmbeddingProvider, GenerationProvider
from app.llm.openai_provider import OpenAIEmbeddingProvider, OpenAIGenerationProvider


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    return OpenAIEmbeddingProvider()


@lru_cache
def get_generation_provider() -> GenerationProvider:
    return OpenAIGenerationProvider()
