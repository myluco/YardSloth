"""
Low-level Ollama HTTP chat used by LangGraph LLM workflows.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional

from agents.llm.errors import OllamaError

DEFAULT_HOST = "http://localhost:11434"
DEFAULT_MODEL = "gemma4:31b-cloud"

# Suggested trio (pull via Ollama): diverse gatherers + a smaller judge for merge/QA.
DEFAULT_MODEL_A = "gemma4:31b-cloud"
DEFAULT_MODEL_B = "qwen2.5:14b"
DEFAULT_JUDGE_MODEL = "llama3.1:8b"

_LOG_PREFIX = "[YardSloth LLM]"


def _llm_logging_enabled() -> bool:
    raw = os.environ.get("YARD_SLOTH_LLM_LOG", "1").strip().lower()
    return raw not in {"0", "false", "no", "off"}


def log_llm(message: str) -> None:
    if _llm_logging_enabled():
        print(f"{_LOG_PREFIX} {message}", file=sys.stderr, flush=True)


def _llm_log_responses_enabled() -> bool:
    raw = os.environ.get("YARD_SLOTH_LLM_LOG_RESPONSES")
    if raw is not None:
        return raw.strip().lower() not in {"0", "false", "no", "off"}
    return _llm_logging_enabled()


def log_llm_response(call_label: str, model: str, text: str) -> None:
    """Print full model output to the terminal (stderr)."""
    if not _llm_log_responses_enabled():
        return
    try:
        max_chars = int(os.environ.get("YARD_SLOTH_LLM_LOG_RESPONSE_MAX", "20000"))
    except ValueError:
        max_chars = 20000
    body = text
    if len(body) > max_chars:
        body = body[:max_chars] + f"\n... [truncated {len(text) - max_chars} chars]"
    log_llm(f"──── response begin │ {call_label} │ {model} │ {len(text)} chars ────")
    for line in body.splitlines():
        print(f"{_LOG_PREFIX} │ {line}", file=sys.stderr, flush=True)
    log_llm(f"──── response end │ {call_label} ────")


@dataclass(frozen=True)
class OllamaModels:
    host: str
    model_a: str
    model_b: str
    judge: str
    legacy_primary: str

    @property
    def source_label(self) -> str:
        return f"judge:{self.judge}|a:{self.model_a}|b:{self.model_b}@{self.host}"


def get_ollama_models() -> OllamaModels:
    try:
        from agents.memory.agent_memory import memory

        settings = memory.get_settings()
        host = (
            settings.get("ollama_endpoint") or os.environ.get("OLLAMA_HOST") or DEFAULT_HOST
        ).rstrip("/")
        legacy = settings.get("ollama_model") or os.environ.get("OLLAMA_MODEL") or DEFAULT_MODEL
        model_a = settings.get("ollama_model_a") or legacy
        model_b = settings.get("ollama_model_b") or os.environ.get("OLLAMA_MODEL_B") or DEFAULT_MODEL_B
        judge = (
            settings.get("ollama_judge_model")
            or os.environ.get("OLLAMA_JUDGE_MODEL")
            or DEFAULT_JUDGE_MODEL
        )
    except Exception:
        host = (os.environ.get("OLLAMA_HOST") or DEFAULT_HOST).rstrip("/")
        legacy = os.environ.get("OLLAMA_MODEL") or DEFAULT_MODEL
        model_a = legacy
        model_b = os.environ.get("OLLAMA_MODEL_B") or DEFAULT_MODEL_B
        judge = os.environ.get("OLLAMA_JUDGE_MODEL") or DEFAULT_JUDGE_MODEL
    return OllamaModels(
        host=host,
        model_a=str(model_a),
        model_b=str(model_b),
        judge=str(judge),
        legacy_primary=str(legacy),
    )


def _ollama_show_model_exists(host: str, model: str) -> bool:
    """Cloud and catalog models often work in the app but are omitted from GET /api/tags."""
    name = (model or "").strip()
    if not name:
        return False
    url = f"{host.rstrip('/')}/api/show"
    payload = json.dumps({"name": name}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            body = json.loads(response.read().decode("utf-8"))
        if body.get("error"):
            return False
        return bool(body.get("modelfile") or body.get("model_info") or body.get("details"))
    except urllib.error.HTTPError:
        return False
    except Exception:
        return False


def ollama_model_resolvable(host: str, model: str, installed: list[str]) -> bool:
    if model_available(installed, model):
        return True
    return _ollama_show_model_exists(host, model)


def _pick_available_model(
    host: str,
    wanted: str,
    installed: list[str],
    extra_fallbacks: list[str],
) -> tuple[str, bool]:
    if ollama_model_resolvable(host, wanted, installed):
        return wanted, False
    for candidate in extra_fallbacks:
        name = (candidate or "").strip()
        if name and ollama_model_resolvable(host, name, installed):
            return name, True
    return wanted, False


def resolve_ollama_models(cfg: OllamaModels) -> tuple[OllamaModels, list[str]]:
    """
    Keep configured model names when Ollama can resolve them (including :cloud models).
    Only substitute when the requested name cannot be resolved via tags or /api/show.
    """
    try:
        installed = list_installed_models(cfg.host)
    except Exception as exc:
        log_llm(f"Could not list Ollama models: {exc}")
        installed = []

    notes: list[str] = []
    model_a, swapped_a = _pick_available_model(
        cfg.host,
        cfg.model_a,
        installed,
        [cfg.legacy_primary, "gemma4:31b-cloud", "gemma4:12b", "gemma4:e4b", "llama3.1:8b"],
    )
    if swapped_a:
        notes.append(f"model_a: {cfg.model_a} → {model_a}")

    model_b, swapped_b = _pick_available_model(
        cfg.host,
        cfg.model_b,
        installed,
        ["qwen2.5:14b", "llama3.1:8b", cfg.legacy_primary],
    )
    if swapped_b:
        notes.append(f"model_b: {cfg.model_b} → {model_b}")

    judge, swapped_j = _pick_available_model(
        cfg.host,
        cfg.judge,
        installed,
        ["llama3.1:8b", "qwen2.5:14b"],
    )
    if swapped_j:
        notes.append(f"judge: {cfg.judge} → {judge}")

    resolved = OllamaModels(
        host=cfg.host,
        model_a=model_a,
        model_b=model_b,
        judge=judge,
        legacy_primary=cfg.legacy_primary,
    )
    return resolved, notes


def chat_completion(
    *,
    host: str,
    model: str,
    system: str,
    user: str,
    json_format: bool = True,
    temperature: float = 0.2,
    timeout: int = 180,
    call_label: str = "",
) -> str:
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "options": {"temperature": temperature},
    }
    if json_format:
        payload["format"] = "json"
    url = f"{host}/api/chat"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    label = call_label or "chat"
    mode = "json" if json_format else "text"
    log_llm(f"→ {label} | model={model} | {mode} | POST {url}")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        elapsed = time.perf_counter() - started
        log_llm(f"✗ {label} | model={model} | HTTP {exc.code} | {elapsed:.1f}s")
        busy = exc.code == 503
        raise OllamaError(
            (
                f"Ollama server busy (HTTP 503) for model={model}. "
                "Too many parallel requests or models loading—retry shortly."
                if busy
                else f"Ollama HTTP {exc.code} at {host} (model={model}). {detail[:200]}"
            )
        ) from exc
    except urllib.error.URLError as exc:
        elapsed = time.perf_counter() - started
        log_llm(f"✗ {label} | model={model} | unreachable | {elapsed:.1f}s")
        raise OllamaError(f"Cannot reach Ollama at {host} (model={model}): {exc}") from exc

    message = body.get("message") or {}
    content = message.get("content")
    elapsed = time.perf_counter() - started
    chars = len(content) if content else 0
    if not content:
        log_llm(f"✗ {label} | model={model} | empty response | {elapsed:.1f}s")
        raise OllamaError(f"Ollama returned no message content (model={model}).")
    text = str(content)
    log_llm(f"← {label} | model={model} | ok | {chars} chars | {elapsed:.1f}s")
    log_llm_response(label, model, text)
    return text


def list_installed_models(host: str) -> list[str]:
    url = f"{host}/api/tags"
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"}, method="GET")
    with urllib.request.urlopen(req, timeout=8) as response:
        body = json.loads(response.read().decode("utf-8"))
    return [str(m.get("name", "")) for m in body.get("models", [])]


def model_available(installed: list[str], model: str) -> bool:
    wanted = model.strip()
    if not wanted:
        return False
    for name in installed:
        tag = name.strip()
        if not tag:
            continue
        if tag == wanted or tag.startswith(f"{wanted}:"):
            return True
        # Installed tag may be longer (e.g. qwen2.5:14b-instruct-q4_K_M) while settings use qwen2.5:14b
        if wanted in tag:
            return True
    return False


def missing_judge_stack_models(models: Optional[OllamaModels] = None) -> list[str]:
    """Return labels for gather/judge models Ollama cannot resolve (tags or /api/show)."""
    cfg = models or get_ollama_models()
    try:
        installed = list_installed_models(cfg.host)
    except Exception:
        return ["Ollama server (cannot list models)"]
    missing: list[str] = []
    for label, name in (
        ("ollama_model_a", cfg.model_a),
        ("ollama_model_b", cfg.model_b),
        ("ollama_judge_model", cfg.judge),
    ):
        if not ollama_model_resolvable(cfg.host, name, installed):
            missing.append(f"{label}={name}")
    return missing


def ensure_judge_models_available(models: Optional[OllamaModels] = None) -> OllamaModels:
    """Fail fast before LangGraph runs when a configured model is not pulled."""
    cfg = models or get_ollama_models()
    resolved, notes = resolve_ollama_models(cfg)
    for note in notes:
        log_llm(f"Auto-selected Ollama tag ({note})")
    missing = missing_judge_stack_models(resolved)
    if missing:
        try:
            installed = list_installed_models(resolved.host)
            installed_line = ", ".join(installed) if installed else "(none — run `ollama list`)"
        except Exception:
            installed_line = "(could not query Ollama)"
        raise OllamaError(
            "Ollama judge stack is not ready. Missing or unavailable: "
            + ", ".join(missing)
            + f". Local tags from `ollama list`: {installed_line}. "
            "Cloud models (e.g. gemma4:31b-cloud) may not appear in that list but still work in the Ollama app—"
            "if you use one, ensure the exact name matches the app dropdown."
        )
    log_llm(
        "Judge stack ready: "
        f"A={resolved.model_a}, B={resolved.model_b}, judge={resolved.judge} @ {resolved.host}"
    )
    return resolved
