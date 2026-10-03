import json
import logging
from typing import List, Optional, Tuple, Type, TypeVar

import httpx
import requests
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from pydantic import BaseModel, ValidationError

from config import settings
from utils.helper import load_prompt

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)
JSON_ATTEMPTS = 2  # first try + one retry on invalid JSON


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

    def _call_gemini(self, model: str, prompt: str, schema: Optional[Type[BaseModel]] = None) -> str:
        # JSON mode: Gemini constrains its output to the pydantic schema
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=schema
        ) if schema else None
        try:
            client = self._get_gemini_client()
            response = client.models.generate_content(model=model, contents=prompt, config=config)
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

    def _call_ollama(self, prompt: str, json_mode: bool = False) -> str:
        model = settings.OLLAMA_MODEL
        url = f"{settings.OLLAMA_URL.rstrip('/')}/api/generate"
        body = {"model": model, "prompt": prompt, "stream": False}
        if json_mode:
            body["format"] = "json"
        try:
            resp = requests.post(url, json=body, timeout=settings.LLM_TIMEOUT_SECONDS)
        except requests.RequestException as e:
            raise _AttemptError("ollama", model, None, f"network error: {type(e).__name__}: {e}", True) from e

        if resp.status_code != 200:
            raise _AttemptError("ollama", model, resp.status_code, resp.text[:500], resp.status_code >= 500)

        text = resp.json().get("response", "")
        if not text:
            raise _AttemptError("ollama", model, resp.status_code, "empty response from model", False)
        return text.strip()

    def _complete(self, prompt: str, schema: Optional[Type[BaseModel]] = None) -> Tuple[str, str]:
        """Runs the fallback chain; returns (text, "provider/model" that answered)."""
        json_mode = schema is not None
        attempts = []
        if settings.LLM_PROVIDER == "ollama":
            attempts.append(("ollama", settings.OLLAMA_MODEL, lambda: self._call_ollama(prompt, json_mode)))
        else:
            attempts.append(("gemini", settings.GEMINI_MODEL, lambda: self._call_gemini(settings.GEMINI_MODEL, prompt, schema)))
            attempts.append(("gemini", settings.GEMINI_FALLBACK_MODEL, lambda: self._call_gemini(settings.GEMINI_FALLBACK_MODEL, prompt, schema)))
            if settings.LOCAL_LLM_FALLBACK:
                attempts.append(("ollama", settings.OLLAMA_MODEL, lambda: self._call_ollama(prompt, json_mode)))

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
            logger.info("LLM answered: provider=%s model=%s json=%s", provider, model, json_mode)
            return text, f"{provider}/{model}"

        raise LLMGenerationError("All LLM attempts failed: " + " | ".join(str(f) for f in failures))

    @staticmethod
    def _build_prompt(prompt_filename: str, context: str, user_query: str) -> str:
        base_prompt = load_prompt(prompt_filename)
        return f"{base_prompt}\n\nContext:\n{context}\n\nQuery/Topic: {user_query}\nOutput:"

    def generate(self, prompt_filename: str, context: str, user_query: str = "") -> str:
        return self._complete(self._build_prompt(prompt_filename, context, user_query))[0]

    def generate_json(self, prompt_filename: str, context: str, user_query: str, schema: Type[T]) -> T:
        """Generates output matching a pydantic schema (Gemini JSON mode, Ollama format=json).

        Invalid or non-conforming JSON is retried once; then LLMGenerationError names the
        provider and the validation errors.
        """
        prompt = (
            self._build_prompt(prompt_filename, context, user_query)
            + "\n\nRespond with a single JSON object only (no markdown fences) that matches this JSON schema:\n"
            + json.dumps(schema.model_json_schema())
        )
        failures = []
        for attempt in range(1, JSON_ATTEMPTS + 1):
            text, source = self._complete(prompt, schema)
            try:
                return schema.model_validate_json(_strip_code_fence(text))
            except ValidationError as e:
                reason = f"{source} returned invalid {schema.__name__} JSON: {_summarize(e)}"
                logger.error("LLM JSON attempt %d/%d failed: %s | output starts: %r",
                             attempt, JSON_ATTEMPTS, reason, text[:300])
                failures.append(reason)
        raise LLMGenerationError(f"No valid JSON after {JSON_ATTEMPTS} attempts: " + " | ".join(failures))


def _strip_code_fence(text: str) -> str:
    """Removes a ```json ... ``` wrapper some local models add despite instructions."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[1] if "\n" in stripped else ""
        if stripped.rstrip().endswith("```"):
            stripped = stripped.rstrip()[:-3]
    return stripped.strip()


def _summarize(error: ValidationError, limit: int = 3) -> str:
    parts = [f"{'.'.join(str(p) for p in err['loc']) or '<root>'}: {err['msg']}" for err in error.errors()[:limit]]
    more = error.error_count() - limit
    return "; ".join(parts) + (f" (+{more} more)" if more > 0 else "")


llm_service = LLMService()
