"""Urgency labels for tonight checklist items."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Literal

ChecklistUrgency = Literal["urgent", "optional"]

_URGENT_HINTS = re.compile(
    r"\b("
    r"frost|freeze|hard freeze|cover|shelter|protect|row cover|frost cloth|"
    r"move (containers|pots)|indoors|before sundown|tonight.?s low|"
    r"below \d+°|at or below|damage|wind chill"
    r")\b",
    re.I,
)

_OPTIONAL_HINTS = re.compile(
    r"\b("
    r"monitor|recheck|if you have time|optional|when convenient|"
    r"no (frost|action) needed|none of your|good practice|consider"
    r")\b",
    re.I,
)


def normalize_checklist_urgency(raw: Any) -> ChecklistUrgency | None:
    if raw is None:
        return None
    text = str(raw).strip().lower().replace("-", "_")
    if text in {"urgent", "high", "critical", "required", "must", "weather", "frost"}:
        return "urgent"
    if text in {"optional", "low", "suggested", "nice", "if_time", "when_convenient"}:
        return "optional"
    return None


def infer_checklist_urgency(item: Dict[str, Any], *, eval_low_f: int | None = None) -> ChecklistUrgency:
    explicit = normalize_checklist_urgency(item.get("urgency"))
    if explicit:
        return explicit

    title = str(item.get("title") or "")
    desc = str(item.get("description") or "")
    blob = f"{title} {desc}"

    if _OPTIONAL_HINTS.search(blob) and not _URGENT_HINTS.search(blob):
        return "optional"
    if _URGENT_HINTS.search(blob):
        return "urgent"

    item_id = str(item.get("id") or "")
    if item_id in {"evening-clear", "evening-general-monitor"}:
        return "optional"
    if item_id.endswith("-mulch"):
        return "optional"
    if item_id.endswith(("-shelter", "-cover")):
        return "urgent"

    return "optional"


def apply_checklist_urgency(
    items: List[Dict[str, Any]],
    *,
    eval_low_f: int | None = None,
) -> List[Dict[str, Any]]:
    enriched: List[Dict[str, Any]] = []
    for row in items:
        item = dict(row)
        explicit = normalize_checklist_urgency(item.get("urgency"))
        item["urgency"] = explicit if explicit else infer_checklist_urgency(item, eval_low_f=eval_low_f)
        enriched.append(item)
    enriched.sort(key=lambda r: (0 if r.get("urgency") == "urgent" else 1, str(r.get("title") or "")))
    return enriched
