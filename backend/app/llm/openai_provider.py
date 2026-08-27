from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.llm.base import EmbeddingProvider, GenerationProvider

settings = get_settings()


def _client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, client: OpenAI | None = None, model: str | None = None):
        self._client = client or _client()
        self._model = model or settings.embedding_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed([text])[0]


class OpenAIGenerationProvider(GenerationProvider):
    def __init__(self, client: OpenAI | None = None, model: str | None = None):
        self._client = client or _client()
        self._model = model or settings.generation_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content or ""
