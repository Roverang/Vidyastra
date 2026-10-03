import logging
from typing import List, Optional

import httpx
import requests
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from config import settings
from utils.helper import load_prompt

logger = logging.getLogger(__name__)


class LLMGenerationError(Exception):
    """Raised when every configured LLM backend failed to produce an answer."""


class _AttemptError(Exception):
    def __init__(self, provider: str, model: str, status: Optional[int], message: str, retryable: bool):
        self.provider = provider
        self.model = model
        self.status = status
        self.message = message
        self.retryable = retryable
        super().__init__(f"{provider}/{model} (status={status}): {message}")


class LLMService:
    def __init__(self):
        self._gemini_client = None

    def _get_gemini_client(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        if self._gemini_client is None:
            self._gemini_client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options=genai_types.HttpOptions(timeout=settings.LLM_TIMEOUT_SECONDS * 1000),
            )
        return self._gemini_client

    def _call_gemini(self, model: str, prompt: str) -> str:
        try:
            client = self._get_gemini_client()
            response = client.models.generate_content(model=model, contents=prompt)
        except genai_errors.APIError as e:
            if e.code == 404:
                raise _AttemptError("gemini", model, e.code, f"model not found: {e.status}: {e.message}", True) from e
            retryable = e.code == 429 or (e.code is not None and e.code >= 500) or e.status in ("UNAVAILABLE", "RESOURCE_EXHAUSTED")
            raise _AttemptError("gemini", model, e.code, f"{e.status}: {e.message}", retryable) from e
        except httpx.TransportError as e:
            raise _AttemptError("gemini", model, None, f"network error: {type(e).__name__}: {e}", True) from e
        except RuntimeError as e:
            raise _AttemptError("gemini", model, None, str(e), False) from e

        text = response.text
        if not text:
            raise _AttemptError("gemini", model, None, "empty response from model", False)
        return text.strip()

    def _call_ollama(self, prompt: str) -> str:
        model = settings.OLLAMA_MODEL
        url = f"{settings.OLLAMA_URL.rstrip('/')}/api/generate"
        try:
            resp = requests.post(
                url,
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
        except requests.RequestException as e:
            raise _AttemptError("ollama", model, None, f"network error: {type(e).__name__}: {e}", True) from e

        if resp.status_code != 200:
            raise _AttemptError("ollama", model, resp.status_code, resp.text[:500], resp.status_code >= 500)

        text = resp.json().get("response", "")
        if not text:
            raise _AttemptError("ollama", model, resp.status_code, "empty response from model", False)
        return text.strip()

    def _complete(self, prompt: str) -> str:
        attempts = []
        if settings.LLM_PROVIDER == "ollama":
            attempts.append(("ollama", settings.OLLAMA_MODEL, lambda: self._call_ollama(prompt)))
        else:
            attempts.append(("gemini", settings.GEMINI_MODEL, lambda: self._call_gemini(settings.GEMINI_MODEL, prompt)))
            attempts.append(("gemini", settings.GEMINI_FALLBACK_MODEL, lambda: self._call_gemini(settings.GEMINI_FALLBACK_MODEL, prompt)))
            if settings.LOCAL_LLM_FALLBACK:
                attempts.append(("ollama", settings.OLLAMA_MODEL, lambda: self._call_ollama(prompt)))

        failures: List[_AttemptError] = []
        for provider, model, call in attempts:
            # The Gemini fallback model is only worth trying for transient/capacity errors.
            if provider == "gemini" and failures and not failures[-1].retryable:
                continue
            try:
                text = call()
            except _AttemptError as e:
                logger.error("LLM attempt failed: provider=%s model=%s status=%s error=%s", e.provider, e.model, e.status, e.message)
                failures.append(e)
                continue
            logger.info("LLM answered: provider=%s model=%s", provider, model)
            return text

        raise LLMGenerationError("All LLM attempts failed: " + " | ".join(str(f) for f in failures))

    def generate(self, prompt_filename: str, context: str, user_query: str = "") -> str:
        base_prompt = load_prompt(prompt_filename)
        full_prompt = f"{base_prompt}\n\nContext:\n{context}\n\nQuery/Topic: {user_query}\nOutput:"
        return self._complete(full_prompt)


llm_service = LLMService()
