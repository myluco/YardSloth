"""
LangGraph evening checklist: dual gather + judge JSON items.
"""

from __future__ import annotations

from typing import Any, List

from agents.assets.prompts import (
    EVENING_CHECKLIST_JUDGE_SYSTEM,
    EVENING_CHECKLIST_SYSTEM,
    build_evening_checklist_judge_user_prompt,
)
from agents.llm.graphs.dual_judge_graph import run_dual_judge
from agents.llm.checklist_dedupe import dedupe_checklist_items
from agents.llm.checklist_json import extract_checklist_items, merge_optional_items_from_drafts
from agents.llm.errors import OllamaError
from agents.llm.ollama_transport import ensure_judge_models_available, log_llm


def run_evening_checklist_workflow(
    user_prompt: str,
    plant_names: list[str] | None = None,
) -> tuple[list[dict[str, Any]], str]:
    models = ensure_judge_models_available()
    names = [n.strip() for n in (plant_names or []) if n and n.strip()]
    log_llm("evening checklist workflow | 3 Ollama calls (gather_a + gather_b parallel → judge)")
    judge_user = build_evening_checklist_judge_user_prompt(models, names)
    result = run_dual_judge(
        gather_system=EVENING_CHECKLIST_SYSTEM,
        gather_user=user_prompt,
        judge_system=EVENING_CHECKLIST_JUDGE_SYSTEM,
        judge_user=judge_user,
        json_gather=True,
        json_judge=True,
        gather_temperature=0.25,
        judge_temperature=0.1,
        models=models,
    )
    final = result.get("final_text") or ""
    if not final.strip():
        raise OllamaError("Evening checklist judge returned empty output.")
    items = extract_checklist_items(final)
    before = len(items)
    items = dedupe_checklist_items(items, names)
    if len(items) < before:
        log_llm(f"evening checklist | deduped judge output {before} → {len(items)} items")

    items = merge_optional_items_from_drafts(
        items,
        result.get("candidate_a") or "",
        result.get("candidate_b") or "",
    )
    items = dedupe_checklist_items(items, names)
    source = models.source_label
    return items, source
