"""Map agent Ollama exceptions to HTTP status codes for API responses."""

from agents.llm.errors import OllamaError, OllamaProfileValidationError


def plant_care_error_response(exc: Exception) -> tuple[int, str, str]:
    """
    Returns (http_status, error_type, message).
    503 = Ollama down / busy / models missing — not incomplete JSON.
    422 = profile JSON failed validation after judge.
    502 = other upstream LLM failures.
    """
    if isinstance(exc, OllamaProfileValidationError):
        return exc.http_status, exc.error_type, str(exc)
    if isinstance(exc, OllamaError):
        return getattr(exc, "http_status", 503), getattr(exc, "error_type", "ollama_error"), str(
            exc
        )
    message = str(exc)
    lower = message.lower()
    if "judge stack is not ready" in lower or "cannot reach ollama" in lower:
        return 503, "ollama_unavailable", message
    if "server busy (http 503)" in lower:
        return 503, "ollama_busy", message
    return 502, "plant_care_failed", f"Plant refresh failed: {message}"
