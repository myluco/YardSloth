class OllamaError(RuntimeError):
    """Raised when Ollama is unreachable or returns unusable output."""

    http_status: int = 503
    error_type: str = "ollama_error"


class OllamaProfileValidationError(OllamaError):
    """Judge/gather JSON did not satisfy the plant profile schema."""

    http_status = 422
    error_type = "llm_profile_invalid"
