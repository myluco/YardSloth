"""
agents/agent/evening_checklist_agent.py

Builds a same-evening action checklist from the user's confirmed plants
and live frost/forecast context. Invoked only when the user requests it.
"""

import json
import re
from typing import Any, Dict, List

from agents.agent.frost_agent import frost_agent
from agents.llm.ollama_client import OllamaError, _chat, _ollama_config
from agents.memory.agent_memory import memory, plant_location_labels


def _extract_items_json(text: str) -> List[Dict[str, Any]]:
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
        clean.append({"id": item_id, "title": title, "description": desc})
    if not clean:
        raise OllamaError("Checklist contained no usable items.")
    return clean[:12]


def _deterministic_checklist(
    plants: List[Dict[str, Any]],
    tonight_low_f: int,
    apparent_low_f: int,
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    eval_low = min(tonight_low_f, apparent_low_f)

    for plant in plants:
        name = plant.get("common_name") or "Plant"
        locs = plant_location_labels(plant)
        loc = " · ".join(locs) if locs else "your yard"
        threshold = int(plant.get("frost_threshold_f") or 32)
        sensitivity = plant.get("frost_sensitivity") or "semi_hardy"
        bloom = plant.get("bloom_wood") or ""
        plant_id = plant.get("id") or name

        if eval_low > threshold:
            continue

        if sensitivity == "tender":
            items.append(
                {
                    "id": f"evening-{plant_id}-shelter",
                    "title": f"Shelter {name} ({loc}) before sundown",
                    "description": (
                        f"Forecast low {eval_low}°F is at or below this plant's {threshold}°F limit. "
                        "Move containers indoors or into a garage; for in-ground tender plants, "
                        "use breathable frost fabric and avoid plastic touching leaves."
                    ),
                }
            )
            continue

        if sensitivity == "semi_hardy":
            bud_note = (
                " Old-wood bloomers lose next season's flower buds in a hard freeze—cover buds, not just roots."
                if bloom == "old_wood"
                else ""
            )
            items.append(
                {
                    "id": f"evening-{plant_id}-cover",
                    "title": f"Cover {name} at {loc}",
                    "description": (
                        f"Tonight's low ({eval_low}°F) may damage tissue below {threshold}°F.{bud_note} "
                        "Anchor frost cloth at the edges; remove when temperatures rise above freezing."
                    ),
                }
            )
            continue

        if eval_low <= 20:
            items.append(
                {
                    "id": f"evening-{plant_id}-mulch",
                    "title": f"Check mulch around {name} ({loc})",
                    "description": (
                        f"Hardy, but an unusually cold night ({eval_low}°F) can still stress crowns. "
                        "Confirm mulch is in place per your care notes; water soil lightly if dry before freeze."
                    ),
                }
            )

    if not items and eval_low <= 36:
        items.append(
            {
                "id": "evening-general-monitor",
                "title": "Monitor overnight temperatures",
                "description": (
                    f"Forecast low is {eval_low}°F. Your entered plants are within their thresholds tonight; "
                    "recheck the forecast in the morning before pruning or fertilizing."
                ),
            }
        )

    return items


class EveningChecklistAgent:
    def generate(self) -> Dict[str, Any]:
        plants = memory.get_plants()
        if not plants:
            return {
                "items": [],
                "source": "none",
                "message": "Add and confirm plants in your yard before building an evening checklist.",
            }

        frost_status = frost_agent.evaluate_frost_threat()
        forecast = frost_status.get("forecast") or []
        tonight = forecast[0] if forecast else {}
        tonight_low = int(tonight.get("temp_min") or 45)
        apparent_low = int(tonight.get("apparent_min") or tonight_low)
        alert = frost_status.get("alert") or {}
        settings = memory.get_settings()
        is_sim = settings.get("mock_frost_simulation", False)
        eval_low = 31 if is_sim else min(tonight_low, apparent_low)

        plant_lines = []
        for p in plants:
            plant_lines.append(
                f"- {p.get('common_name')} @ {' · '.join(plant_location_labels(p)) or 'yard'}: "
                f"frost {p.get('frost_sensitivity')}, threshold {p.get('frost_threshold_f')}°F, "
                f"bloom_wood={p.get('bloom_wood')}, mulch: {p.get('mulch_rules', 'n/a')[:120]}"
            )
        plants_block = "\n".join(plant_lines)

        system = (
            "You are the Yard Sloth Frost Watch evening planner. Respond with JSON only. "
            "Include actionable steps ONLY for plants listed by the user—never generic chores "
            "(no random tomatoes, hoses, or hydrangeas unless that exact plant is listed). "
            "Steps must be doable before sundown tonight."
        )
        user_prompt = f"""Tonight's weather context:
- Effective low for planning: {eval_low}°F (simulation={is_sim})
- Forecast min: {tonight_low}°F, apparent min: {apparent_low}°F
- Alert: {alert.get('text', 'none')}
- Recommended action summary: {alert.get('action', 'none')}

User's confirmed yard plants:
{plants_block}

Return JSON:
{{
  "items": [
    {{ "id": "short-unique-id", "title": "verb-led step", "description": "1-2 sentences, plant-specific" }}
  ]
}}
Use at most 8 items. Skip plants that need no action tonight."""

        source = "rules"
        items: List[Dict[str, Any]] = []
        try:
            _, model = _ollama_config()
            content = _chat(user_prompt, system)
            items = _extract_items_json(content)
            source = f"ollama:{model}"
        except OllamaError as exc:
            print("Evening checklist Ollama fallback:", exc)

        if not items:
            items = _deterministic_checklist(plants, tonight_low, apparent_low)
            if source != "rules":
                source = f"{source}+rules"

        if not items:
            items = [
                {
                    "id": "evening-clear",
                    "title": "No frost-protection steps needed tonight",
                    "description": (
                        f"With an effective low around {eval_low}°F, none of your "
                        f"{len(plants)} entered plants are below their frost thresholds. "
                        "Recheck if the forecast changes or you add tender plants."
                    ),
                }
            ]

        return {
            "items": items,
            "source": source,
            "tonight_low_f": eval_low,
            "message": None,
        }


evening_checklist_agent = EveningChecklistAgent()
