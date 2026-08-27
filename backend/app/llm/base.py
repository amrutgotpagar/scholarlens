from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Abstraction so the embedding backend (OpenAI today) can be swapped without touching callers."""

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text, in the same order."""

    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""


class GenerationProvider(ABC):
    """Abstraction so the generation backend (OpenAI today) can be swapped without touching callers."""

    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Return the full generated answer for a prompt."""
