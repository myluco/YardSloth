"""Parse evening checklist JSON from Ollama."""

import json
import re
from typing import Any, Dict, List

from agents.llm.checklist_urgency import infer_checklist_urgency, normalize_checklist_urgency
from agents.llm.errors import OllamaError


def _normalize_title_key(title: str) -> str:
    return " ".join((title or "").lower().split())


def try_extract_checklist_items(text: str) -> List[Dict[str, Any]]:
    try:
        return extract_checklist_items(text)
    except OllamaError:
        return []


def merge_optional_items_from_drafts(
    judge_items: List[Dict[str, Any]],
    candidate_a: str,
    candidate_b: str,
    *,
    max_items: int = 12,
) -> List[Dict[str, Any]]:
    """Judge models often drop optional steps; backfill from gather drafts."""
    seen = {_normalize_title_key(item.get("title", "")) for item in judge_items}
    merged: List[Dict[str, Any]] = [dict(item) for item in judge_items]

    for draft_text in (candidate_a, candidate_b):
        for item in try_extract_checklist_items(draft_text):
            key = _normalize_title_key(item.get("title", ""))
            if not key or key in seen:
                continue
            urgency = normalize_checklist_urgency(item.get("urgency"))
            if urgency is None:
                urgency = infer_checklist_urgency(item)
            if urgency != "optional":
                continue
            item = dict(item)
            item["urgency"] = "optional"
            merged.append(item)
            seen.add(key)
            if len(merged) >= max_items:
                return merged[:max_items]

    return merged[:max_items]


def extract_checklist_items(text: str) -> List[Dict[str, Any]]:
    raw = text.strip()
    if not raw:
        raise OllamaError("Ollama returned an empty checklist response.")

    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        raw = fence.group(1)

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise OllamaError("Checklist response was not valid JSON.")

    data = json.loads(raw[start : end + 1])
    items = data.get("items")
    if not isinstance(items, list):
        raise OllamaError("Checklist JSON must include an items array.")

    clean: List[Dict[str, Any]] = []
    for idx, row in enumerate(items):
        if not isinstance(row, dict):
            continue
        title = str(row.get("title", "")).strip()
        desc = str(row.get("description", row.get("desc", ""))).strip()
        if not title:
            continue
        item_id = str(row.get("id", "")).strip() or f"evening-{idx + 1}"
        entry: Dict[str, Any] = {"id": item_id, "title": title, "description": desc}
        urgency = normalize_checklist_urgency(row.get("urgency"))
        if urgency:
            entry["urgency"] = urgency
        clean.append(entry)
    if not clean:
        raise OllamaError("Checklist contained no usable items.")
    return clean[:12]
