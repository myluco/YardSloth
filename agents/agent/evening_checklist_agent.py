"""
agents/agent/evening_checklist_agent.py

Builds a same-evening action checklist from the user's confirmed plants
and live frost/forecast context. Invoked only when the user requests it.
"""

from typing import Any, Dict, List

from agents.agent.frost_agent import frost_agent
from agents.assets.prompts import build_evening_checklist_user_prompt, format_garden_context_block
from agents.llm.errors import OllamaError
from agents.llm.graphs.evening_checklist_workflow import run_evening_checklist_workflow
from agents.memory.agent_memory import memory, plant_location_labels


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
                f"prune: {(p.get('prune_directions') or p.get('prune_rules') or 'n/a')[:120]}, "
                f"mulch: {p.get('mulch_rules', 'n/a')[:80]}"
            )
        plants_block = "\n".join(plant_lines)

        user_prompt = build_evening_checklist_user_prompt(
            eval_low_f=eval_low,
            simulation=is_sim,
            tonight_low_f=tonight_low,
            apparent_low_f=apparent_low,
            alert_text=alert.get("text", "none"),
            action_summary=alert.get("action", "none"),
            plants_block=plants_block,
            garden_context=format_garden_context_block(settings),
            forecast_location=str(frost_status.get("location") or ""),
        )

        source = "rules"
        items: List[Dict[str, Any]] = []
        try:
            items, source = run_evening_checklist_workflow(user_prompt)
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
