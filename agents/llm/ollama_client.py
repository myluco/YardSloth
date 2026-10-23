"""
agents/llm/ollama_client.py

Structured plant-care profiles via Ollama + LangGraph judge workflows.
"""

from typing import Any, Dict, Optional

from agents.llm.errors import OllamaError

__all__ = ["OllamaError", "fetch_plant_care_profile", "check_ollama_status", "_chat", "_ollama_config"]
from agents.llm.graphs.plant_care_workflow import run_plant_care_workflow
from agents.llm.ollama_transport import (
    chat_completion,
    get_ollama_models,
    list_installed_models,
    ollama_model_resolvable,
    resolve_ollama_models,
)
from agents.llm.plant_profile_validation import extract_json_object, validate_plant_profile

# Back-compat re-exports
_extract_json_object = extract_json_object
_validate_plant_profile = validate_plant_profile

DEFAULT_MODEL = "gemma4:31b-cloud"
DEFAULT_HOST = "http://localhost:11434"


def _ollama_config() -> tuple[str, str]:
    models = get_ollama_models()
    return models.host, models.legacy_primary


def _chat(prompt: str, system: str, *, json_format: bool = True, temperature: float = 0.2) -> str:
    host, model = _ollama_config()
    return chat_completion(
        host=host,
        model=model,
        system=system,
        user=prompt,
        json_format=json_format,
        temperature=temperature,
    )


def check_ollama_status() -> Dict[str, Any]:
    """Ping Ollama and report whether gather + judge models are available."""
    models = get_ollama_models()
    try:
        installed = list_installed_models(models.host)
    except Exception as exc:
        return {
            "ok": False,
            "host": models.host,
            "model": models.legacy_primary,
            "model_a": models.model_a,
            "model_b": models.model_b,
            "judge_model": models.judge,
            "error": f"Cannot reach Ollama: {exc}",
        }

    resolved, _ = resolve_ollama_models(models)
    checks = {
        "model_a": ollama_model_resolvable(models.host, resolved.model_a, installed),
        "model_b": ollama_model_resolvable(models.host, resolved.model_b, installed),
        "judge_model": ollama_model_resolvable(models.host, resolved.judge, installed),
        "legacy_primary": ollama_model_resolvable(models.host, models.legacy_primary, installed),
    }
    ok = checks["model_a"] and checks["model_b"] and checks["judge_model"]
    missing = [name for name, ready in checks.items() if not ready]
    return {
        "ok": ok,
        "host": models.host,
        "model": models.legacy_primary,
        "model_a": models.model_a,
        "model_b": models.model_b,
        "judge_model": models.judge,
        "models_available": installed,
        "models_ready": checks,
        "error": None
        if ok
        else f"Missing Ollama models: {', '.join(missing)}. Pull model_a/b/judge or update settings.",
    }


def fetch_plant_care_profile(
    plant_name: str,
    species: Optional[str] = None,
    *,
    skip_cache: bool = False,
) -> Dict[str, Any]:
    """
    Web research + dual-model gather + judge (LangGraph). Results cached on disk.
    """
    name = (plant_name or "").strip()
    if not name:
        raise OllamaError("Plant name is required for Ollama lookup.")

    sci = (species or "").strip()

    settings: Dict[str, Any] = {}
    try:
        from agents.memory.agent_memory import memory

        settings = memory.get_settings()
        if skip_cache:
            memory.clear_cached_plant_profile(name, sci or None)
        cached = memory.get_cached_plant_profile(name, sci or None)
        if cached:
            cached = {**cached, "source": f"{cached.get('source', 'cache')} (cached)"}
            return cached
    except Exception:
        pass

    try:
        profile = run_plant_care_workflow(name, sci, settings=settings)
    except RuntimeError as exc:
        raise OllamaError(str(exc)) from exc

    try:
        from agents.memory.agent_memory import memory

        memory.set_cached_plant_profile(name, sci or None, profile)
    except Exception as exc:
        print("Plant profile cache save failed:", exc)

    return profile
