"""Local, zero-cost providers backed by Ollama.

Ollama exposes an OpenAI-compatible HTTP surface, so these are thin subclasses of the
OpenAI providers that just point the client at Ollama's base_url instead of OpenAI's —
everything else (retries, request/response shape) is identical. Ollama ignores the API
key entirely; any non-empty string satisfies the client.
"""

from openai import OpenAI

from app.config import get_settings
from app.llm.openai_provider import OpenAIEmbeddingProvider, OpenAIGenerationProvider

settings = get_settings()


def _ollama_client() -> OpenAI:
    return OpenAI(api_key="ollama", base_url=settings.ollama_base_url)


class OllamaEmbeddingProvider(OpenAIEmbeddingProvider):
    def __init__(self) -> None:
        super().__init__(client=_ollama_client(), model=settings.ollama_embedding_model)


class OllamaGenerationProvider(OpenAIGenerationProvider):
    def __init__(self) -> None:
        super().__init__(client=_ollama_client(), model=settings.ollama_generation_model)
