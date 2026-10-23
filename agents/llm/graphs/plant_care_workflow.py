"""
LangGraph plant-care pipeline: web research -> research_a + research_b (parallel) -> judge -> validate.
"""

from __future__ import annotations

from typing import Any, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from agents.assets.prompts import (
    PLANT_CARE_PROFILE_SYSTEM,
    PLANT_PROFILE_JUDGE_SYSTEM,
    build_plant_care_profile_user_prompt,
    build_plant_profile_judge_user_prompt,
    format_garden_context_block,
)
from agents.llm.graphs.dual_judge_graph import run_dual_judge
from agents.llm.errors import OllamaError
from agents.llm.plant_profile_validation import (
    extract_json_object,
    merge_profile_field_gaps,
    parse_profile_dict,
    validate_plant_profile,
)
from agents.llm.ollama_transport import (
    OllamaModels,
    ensure_judge_models_available,
    get_ollama_models,
    log_llm,
)
from agents.mcp.plant_research import gather_plant_research


class PlantCareState(TypedDict, total=False):
    plant_name: str
    species: str
    garden_context: str
    models: OllamaModels
    research_excerpt: str
    research_sources: list[str]
    profile_raw: str
    profile_candidate_a: str
    profile_candidate_b: str
    judge_profile_rationale: str
    llm_warnings: list[str]
    profile: dict[str, Any]


def _research_node(state: PlantCareState) -> dict[str, Any]:
    log_llm(f"plant workflow | research (web) | {state['plant_name']}")
    name = state["plant_name"]
    species = (state.get("species") or "").strip() or None
    research = gather_plant_research(name, species)
    return {
        "research_excerpt": str(research.get("excerpt") or ""),
        "research_sources": list(research.get("sources") or []),
    }


def _judge_plant_profile(state: PlantCareState) -> dict[str, Any]:
    log_llm(
        "plant workflow | Ollama | research_a + research_b (parallel) → judge "
        "(3 calls; web excerpts already fetched)"
    )
    models = state["models"]
    user = build_plant_care_profile_user_prompt(
        state["plant_name"],
        state.get("species") or "",
        state["garden_context"],
        research_excerpt=state.get("research_excerpt") or "",
        research_sources=state.get("research_sources") or [],
    )
    judge_user = build_plant_profile_judge_user_prompt(
        state["plant_name"],
        state.get("species") or "",
        state.get("research_excerpt") or "",
        state.get("research_sources") or [],
        models,
    )
    result = run_dual_judge(
        gather_system=PLANT_CARE_PROFILE_SYSTEM,
        gather_user=user,
        judge_system=PLANT_PROFILE_JUDGE_SYSTEM,
        judge_user=judge_user,
        json_gather=True,
        json_judge=True,
        gather_temperature=0.2,
        judge_temperature=0.08,
        gather_a_label="research_a",
        gather_b_label="research_b",
        judge_label="judge",
        models=models,
    )
    profile_warnings = list(result.get("gather_warnings") or [])
    profile_rationale = (result.get("judge_rationale") or "").strip()
    if profile_rationale:
        profile_warnings.append(profile_rationale)
    return {
        "profile_raw": result.get("final_text") or "",
        "profile_candidate_a": result.get("candidate_a") or "",
        "profile_candidate_b": result.get("candidate_b") or "",
        "judge_profile_rationale": profile_rationale,
        "llm_warnings": profile_warnings,
    }


def _validate_node(state: PlantCareState) -> dict[str, Any]:
    parsed = extract_json_object(state.get("profile_raw") or "")
    draft_a = parse_profile_dict(state.get("profile_candidate_a") or "")
    draft_b = parse_profile_dict(state.get("profile_candidate_b") or "")
    parsed = merge_profile_field_gaps(parsed, draft_a, draft_b)
    models = state["models"]
    profile = validate_plant_profile(
        parsed,
        state["plant_name"],
        source_label=models.source_label,
    )
    profile["research_sources"] = list(state.get("research_sources") or [])
    rationale = (state.get("judge_profile_rationale") or "").strip()
    if rationale:
        profile["judge_rationale"] = rationale[:1500]
    warnings = list(state.get("llm_warnings") or [])
    if warnings:
        profile["llm_warnings"] = warnings
    return {"profile": profile}


def _build_graph() -> Any:
    graph = StateGraph(PlantCareState)
    graph.add_node("research", _research_node)
    graph.add_node("judge_plant_profile", _judge_plant_profile)
    graph.add_node("validate", _validate_node)
    graph.add_edge(START, "research")
    graph.add_edge("research", "judge_plant_profile")
    graph.add_edge("judge_plant_profile", "validate")
    graph.add_edge("validate", END)
    return graph.compile()


_COMPILED = None


def run_plant_care_workflow(
    plant_name: str,
    species: str = "",
    *,
    settings: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = _build_graph()

    name = (plant_name or "").strip()
    if not name:
        raise OllamaError("Plant name is required for Ollama lookup.")

    sci = (species or "").strip()
    garden_context = format_garden_context_block(settings or {})
    models = ensure_judge_models_available()
    log_llm(
        f"plant workflow | start | {name}"
        + (f" ({sci})" if sci else "")
        + " | expect 3 Ollama calls (research_a + research_b → judge)"
    )
    final = _COMPILED.invoke(
        {
            "plant_name": name,
            "species": sci,
            "garden_context": garden_context,
            "models": models,
        }
    )
    profile = final.get("profile")
    if not profile:
        raise OllamaError("Plant care workflow did not produce a profile.")
    return profile
