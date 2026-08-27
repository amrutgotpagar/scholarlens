"""NVIDIA NIM providers: a free, hosted alternative to OpenAI/Ollama.

NIM's chat completions endpoint is OpenAI-compatible, so generation reuses
OpenAIGenerationProvider unchanged (it only ever reads delta.content / message.content,
so a reasoning model's separate reasoning_content field is naturally ignored rather than
streamed to the client as if it were the answer).

Embeddings are NOT a drop-in reuse: nv-embedqa-e5-v5 is an asymmetric retrieval model that
expects an input_type of "query" or "passage" depending on which side of retrieval the text
is on, passed via extra_body since it isn't a standard OpenAI embeddings parameter. It also
caps input at 512 tokens, well under this project's default 800-word chunk size, so
truncate="END" is set to fail soft (truncate) rather than error on longer chunks.
"""

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.llm.openai_provider import OpenAIEmbeddingProvider, OpenAIGenerationProvider

settings = get_settings()


def _nvidia_client() -> OpenAI:
    return OpenAI(api_key=settings.nvidia_api_key, base_url=settings.nvidia_base_url)


class NvidiaEmbeddingProvider(OpenAIEmbeddingProvider):
    def __init__(self) -> None:
        super().__init__(client=_nvidia_client(), model=settings.nvidia_embedding_model)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self._client.embeddings.create(
            model=self._model,
            input=texts,
            extra_body={"input_type": "passage", "truncate": "END"},
        )
        return [item.embedding for item in response.data]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def embed_query(self, text: str) -> list[float]:
        response = self._client.embeddings.create(
            model=self._model,
            input=[text],
            extra_body={"input_type": "query", "truncate": "END"},
        )
        return response.data[0].embedding


class NvidiaGenerationProvider(OpenAIGenerationProvider):
    def __init__(self) -> None:
        super().__init__(client=_nvidia_client(), model=settings.nvidia_generation_model)
