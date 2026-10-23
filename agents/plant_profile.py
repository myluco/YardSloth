"""
Merge Ollama plant-care profiles into yard plant records.
"""

from datetime import datetime
from typing import Any, Dict

from agents.assets.prompts import PLANT_PROFILE_EXTENDED_FIELDS
from agents.llm.ollama_client import fetch_plant_care_profile

_MERGE_CARE_KEYS = (
    "bloom_wood",
    "frost_sensitivity",
    "frost_threshold_f",
    "care_category",
    "prune_directions",
    "prune_window",
    "prune_rules",
    "fertilize_window",
    "fertilize_type",
    "mulch_rules",
    "reasoning_summary",
    "research_sources",
    "horticulture_brief",
    "judge_rationale",
    "llm_warnings",
    *PLANT_PROFILE_EXTENDED_FIELDS.keys(),
)


def stamp_care_refreshed_at(record: Dict[str, Any]) -> None:
    record["care_refreshed_at"] = datetime.now().isoformat(timespec="seconds")


def merge_ollama_profile_into_plant(plant: Dict[str, Any], knowledge: Dict[str, Any]) -> None:
    """Update care traits on a plant or candidate; preserve id, locations, notes, photos."""
    if knowledge.get("common_name"):
        plant["common_name"] = knowledge["common_name"]
    if knowledge.get("species"):
        plant["species"] = knowledge["species"]
        plant["genus"] = str(knowledge["species"]).split(" ")[0]

    extended_keys = set(PLANT_PROFILE_EXTENDED_FIELDS.keys())
    for key in _MERGE_CARE_KEYS:
        if key in extended_keys:
            if key not in knowledge:
                continue
            value = knowledge.get(key, "")
            if value:
                plant[key] = value
            else:
                plant.pop(key, None)
        elif key == "llm_warnings":
            value = knowledge.get(key)
            if isinstance(value, list) and value:
                plant[key] = value
            else:
                plant.pop(key, None)
        elif knowledge.get(key) is not None and knowledge.get(key) != "":
            plant[key] = knowledge[key]

    if knowledge.get("source"):
        plant["source"] = knowledge["source"]

    summary = (knowledge.get("reasoning_summary") or "").strip()
    if summary:
        plant["reasoning"] = summary

    stamp_care_refreshed_at(plant)


def refresh_plant_record_from_ollama(plant: Dict[str, Any], skip_cache: bool = True) -> Dict[str, Any]:
    name = (plant.get("common_name") or "").strip()
    if not name:
        raise ValueError("Plant has no common name to look up.")

    species = (plant.get("species") or "").strip() or None
    knowledge = fetch_plant_care_profile(name, species, skip_cache=skip_cache)
    merge_ollama_profile_into_plant(plant, knowledge)
    return plant
