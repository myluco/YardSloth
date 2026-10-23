"""Collapse duplicate frost-protection checklist steps per plant."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Set

from agents.llm.checklist_urgency import infer_checklist_urgency, normalize_checklist_urgency

_FROST_ACTION = re.compile(
    r"\b("
    r"cover|frost|protect|blanket|cloth|wrap|shelter|"
    r"move\s+(?:pots|containers)|indoors|insulation"
    r")\b",
    re.I,
)


def _item_blob(item: Dict[str, Any]) -> str:
    return f"{item.get('title', '')} {item.get('description', '')}"


def _normalize_title_key(title: str) -> str:
    return " ".join((title or "").lower().split())


def _plant_match_keys(name: str) -> List[str]:
    key = name.strip().lower()
    if not key:
        return []
    keys = [key]
    for suffix in (" tree", " plant", " bush", " vine"):
        if key.endswith(suffix):
            keys.append(key[: -len(suffix)].strip())
    return keys


def _plants_mentioned(blob: str, plant_names: List[str]) -> Set[str]:
    lower = blob.lower()
    found: Set[str] = set()
    for name in sorted(plant_names, key=len, reverse=True):
        canonical = name.strip().lower()
        if not canonical:
            continue
        for key in _plant_match_keys(name):
            if key and key in lower:
                found.add(canonical)
                break
    return found


def _is_urgent_frost_item(item: Dict[str, Any]) -> bool:
    explicit = normalize_checklist_urgency(item.get("urgency"))
    urgency = explicit if explicit else infer_checklist_urgency(item)
    if urgency != "urgent":
        return False
    return bool(_FROST_ACTION.search(_item_blob(item)))


def _item_score(item: Dict[str, Any]) -> int:
    return len(_item_blob(item))


def dedupe_checklist_items(
    items: List[Dict[str, Any]],
    plant_names: List[str],
) -> List[Dict[str, Any]]:
    """
    One urgent frost-protection row per plant when possible.
    Drops redundant multi-plant rows when each plant already has its own step.
    """
    names = [str(n).strip() for n in plant_names if str(n).strip()]
    if not items:
        return items

    frost_urgent: List[Dict[str, Any]] = []
    rest: List[Dict[str, Any]] = []

    for item in items:
        if _is_urgent_frost_item(item):
            frost_urgent.append(item)
        else:
            rest.append(item)

    if not frost_urgent:
        return items

    per_plant: Dict[str, Dict[str, Any]] = {}
    multi: List[Dict[str, Any]] = []
    unmatched: List[Dict[str, Any]] = []

    for item in frost_urgent:
        mentioned = _plants_mentioned(_item_blob(item), names) if names else set()
        if len(mentioned) == 1:
            plant = next(iter(mentioned))
            prev = per_plant.get(plant)
            if not prev or _item_score(item) > _item_score(prev):
                per_plant[plant] = item
        elif len(mentioned) > 1:
            multi.append(item)
        else:
            unmatched.append(item)

    covered: Set[str] = set(per_plant.keys())
    deduped_frost: List[Dict[str, Any]] = list(per_plant.values())

    for item in multi:
        mentioned = _plants_mentioned(_item_blob(item), names)
        if mentioned and all(p in covered for p in mentioned):
            continue
        deduped_frost.append(item)
        covered.update(mentioned)

    seen_titles = {_normalize_title_key(i.get("title", "")) for i in deduped_frost}
    for item in unmatched:
        title_key = _normalize_title_key(item.get("title", ""))
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        deduped_frost.append(item)

    seen_titles = set()
    final_frost: List[Dict[str, Any]] = []
    for item in deduped_frost:
        title_key = _normalize_title_key(item.get("title", ""))
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        final_frost.append(item)

    return final_frost + rest
