"""
LangGraph dual-gather + judge pattern for text or JSON LLM tasks.
"""

from __future__ import annotations

from typing import Any, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from agents.llm.errors import OllamaError
from agents.llm.ollama_transport import OllamaModels, chat_completion, get_ollama_models, log_llm


class DualJudgeState(TypedDict, total=False):
    models: OllamaModels
    gather_system: str
    gather_user: str
    judge_system: str
    judge_user: str
    json_gather: bool
    json_judge: bool
    gather_temperature: float
    judge_temperature: float
    gather_a_label: str
    gather_b_label: str
    judge_label: str
    candidate_a: str
    candidate_b: str
    candidate_a_error: str
    candidate_b_error: str
    final_text: str
    judge_rationale: str
    gather_warnings: list[str]


def _gather_a(state: DualJudgeState) -> dict[str, Any]:
    models = state["models"]
    label = (state.get("gather_a_label") or "gather_a").strip() or "gather_a"
    log_llm(f"{label} start (parallel) → {models.model_a}")
    try:
        text = chat_completion(
            host=models.host,
            model=models.model_a,
            system=state["gather_system"],
            user=state["gather_user"],
            json_format=state.get("json_gather", True),
            temperature=state.get("gather_temperature", 0.2),
            call_label=label,
        )
        return {"candidate_a": text.strip(), "candidate_a_error": ""}
    except Exception as exc:
        return {"candidate_a": "", "candidate_a_error": str(exc)}


def _gather_b(state: DualJudgeState) -> dict[str, Any]:
    models = state["models"]
    label = (state.get("gather_b_label") or "gather_b").strip() or "gather_b"
    log_llm(f"{label} start (parallel) → {models.model_b}")
    try:
        text = chat_completion(
            host=models.host,
            model=models.model_b,
            system=state["gather_system"],
            user=state["gather_user"],
            json_format=state.get("json_gather", True),
            temperature=state.get("gather_temperature", 0.2),
            call_label=label,
        )
        return {"candidate_b": text.strip(), "candidate_b_error": ""}
    except Exception as exc:
        return {"candidate_b": "", "candidate_b_error": str(exc)}


def _single_gather_warnings(state: DualJudgeState, models: OllamaModels) -> list[str]:
    warnings: list[str] = []
    err_a = (state.get("candidate_a_error") or "").strip()
    err_b = (state.get("candidate_b_error") or "").strip()
    if err_a:
        warnings.append(f"Gather model A ({models.model_a}) failed: {err_a}")
    if err_b:
        warnings.append(f"Gather model B ({models.model_b}) failed: {err_b}")
    return warnings


def _judge(state: DualJudgeState) -> dict[str, Any]:
    models = state["models"]
    a = (state.get("candidate_a") or "").strip()
    b = (state.get("candidate_b") or "").strip()
    warnings = _single_gather_warnings(state, models)

    if a and not b:
        return {
            "final_text": a,
            "judge_rationale": "Judge skipped: only model A produced a response.",
            "gather_warnings": warnings,
        }
    if b and not a:
        return {
            "final_text": b,
            "judge_rationale": "Judge skipped: only model B produced a response.",
            "gather_warnings": warnings,
        }
    if not a and not b:
        raise OllamaError(
            "Both gather models failed. "
            f"A ({models.model_a}): {state.get('candidate_a_error') or 'unknown'}; "
            f"B ({models.model_b}): {state.get('candidate_b_error') or 'unknown'}"
        )

    prefix = (state.get("judge_user") or "").strip()
    body = _default_judge_user(a, b, models)
    judge_user = f"{prefix}\n\n{body}" if prefix else body

    judge_label = (state.get("judge_label") or "judge").strip() or "judge"
    ga = (state.get("gather_a_label") or "gather_a").strip() or "gather_a"
    gb = (state.get("gather_b_label") or "gather_b").strip() or "gather_b"
    log_llm(f"{judge_label} start → {models.judge} (after {ga} + {gb})")
    try:
        final = chat_completion(
            host=models.host,
            model=models.judge,
            system=state["judge_system"],
            user=judge_user,
            json_format=state.get("json_judge", state.get("json_gather", True)),
            temperature=state.get("judge_temperature", 0.1),
            call_label=judge_label,
        )
    except OllamaError as exc:
        raise OllamaError(
            f"Judge model ({models.judge}) failed after both gather models succeeded: {exc}"
        ) from exc
    return {"final_text": final.strip(), "judge_rationale": "", "gather_warnings": warnings}


def _default_judge_user(candidate_a: str, candidate_b: str, models: OllamaModels) -> str:
    return f"""Model A ({models.model_a}) response:
{candidate_a}

Model B ({models.model_b}) response:
{candidate_b}
"""


def _build_dual_judge_graph() -> Any:
    graph = StateGraph(DualJudgeState)
    graph.add_node("gather_a", _gather_a)
    graph.add_node("gather_b", _gather_b)
    graph.add_node("judge", _judge)
    graph.add_edge(START, "gather_a")
    graph.add_edge(START, "gather_b")
    graph.add_edge("gather_a", "judge")
    graph.add_edge("gather_b", "judge")
    graph.add_edge("judge", END)
    return graph.compile()


_COMPILED = None


def run_dual_judge(
    *,
    gather_system: str,
    gather_user: str,
    judge_system: str,
    judge_user: Optional[str] = None,
    json_gather: bool = True,
    json_judge: Optional[bool] = None,
    gather_temperature: float = 0.2,
    judge_temperature: float = 0.1,
    gather_a_label: str = "gather_a",
    gather_b_label: str = "gather_b",
    judge_label: str = "judge",
    models: Optional[OllamaModels] = None,
) -> DualJudgeState:
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = _build_dual_judge_graph()

    cfg = models or get_ollama_models()
    initial: DualJudgeState = {
        "models": cfg,
        "gather_system": gather_system,
        "gather_user": gather_user,
        "judge_system": judge_system,
        "judge_user": judge_user or "",
        "json_gather": json_gather,
        "json_judge": json_judge if json_judge is not None else json_gather,
        "gather_temperature": gather_temperature,
        "judge_temperature": judge_temperature,
        "gather_a_label": gather_a_label,
        "gather_b_label": gather_b_label,
        "judge_label": judge_label,
    }
    return _COMPILED.invoke(initial)
