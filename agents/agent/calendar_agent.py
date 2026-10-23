"""
agents/agent/calendar_agent.py

Care Calendar Agent.
Fetches plant care specifications live via MCP web browser tool,
then applies deterministic scheduling arithmetic to prevent week overloading.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from agents.agent.calendar_season_parse import (
    due_date_from_season_window,
    propagation_is_seed_primary,
)
from agents.mcp.mcp_client import mcp_client
from agents.memory.agent_memory import memory, plant_location_labels

class CareCalendarAgent:
    def __init__(self):
        self.mcp = mcp_client

    def _task_title(self, plant: Dict[str, Any], action: str) -> str:
        name = plant.get("common_name", "Plant")
        locs = plant_location_labels(plant)
        loc = " · ".join(locs)
        return f"{action} {name} @ {loc}" if loc else f"{action} {name}"

    def _care_knowledge_from_plant_record(self, plant: Dict[str, Any]) -> Dict[str, Any] | None:
        """Use confirmed plant fields only — never call Ollama during calendar generation."""
        bloom_wood = plant.get("bloom_wood")
        if not bloom_wood:
            return None
        return {
            "bloom_wood": bloom_wood,
            "prune_directions": plant.get("prune_directions", ""),
            "prune_rules": plant.get("prune_rules", ""),
            "prune_window": plant.get("prune_window", ""),
            "fertilize_window": plant.get("fertilize_window", ""),
            "fertilize_type": plant.get("fertilize_type", ""),
            "mulch_rules": plant.get("mulch_rules", ""),
            "care_category": plant.get("care_category", ""),
            "propagation_technique": plant.get("propagation_technique", ""),
            "propagation_window": plant.get("propagation_window", ""),
            "seed_germination_window": plant.get("seed_germination_window", ""),
            "source": "plant_record",
        }

    def _care_knowledge_for_plant(self, plant: Dict[str, Any]) -> Dict[str, Any]:
        cached = memory.get_cached_plant_profile(
            plant.get("common_name", ""),
            plant.get("species"),
        )
        if cached:
            return cached

        from_record = self._care_knowledge_from_plant_record(plant)
        if from_record:
            return from_record

        return self.mcp.call_tool(
            "web_browse_plant_care",
            {
                "plant_name": plant["common_name"],
                "species": plant["species"],
            },
        )

    def generate_calendar(self) -> List[Dict[str, Any]]:
        """
        Runs calendar generation crew:
        1. Reads confirmed plants from memory
        2. Queries MCP web browser for live plant pruning & care requirements
        3. Deterministically spreads tasks across the calendar
        """
        plants = memory.get_plants()
        settings = memory.get_settings()
        current_year = datetime.now().year

        last_frost_str = settings.get("last_frost", "04-01")
        first_frost_str = settings.get("first_frost", "11-01")

        def parse_date(md_str: str, default_m: int, default_d: int) -> datetime:
            if not md_str or md_str == "None" or "-" not in md_str:
                return datetime(current_year, default_m, default_d)
            try:
                m, d = map(int, md_str.split("-"))
                return datetime(current_year, m, d)
            except Exception:
                return datetime(current_year, default_m, default_d)

        last_frost = parse_date(last_frost_str, 4, 1)
        first_frost = parse_date(first_frost_str, 11, 1)

        tasks: List[Dict[str, Any]] = []
        task_id = 1

        for plant in plants:
            knowledge = self._care_knowledge_for_plant(plant)
            bloom_wood = knowledge.get(
                "bloom_wood", plant.get("bloom_wood", "not_applicable")
            )

            # 1. Pruning chore
            if bloom_wood == "old_wood":
                # Prune strictly right after mid-summer bloom
                prune_dt = datetime(current_year, 7, 25)
                tasks.append({
                    "id": f"task-{task_id}",
                    "plant_id": plant["id"],
                    "plant_name": plant["common_name"],
                    "plant_species": plant["species"],
                    "type": "prune",
                    "title": self._task_title(plant, "Post-Bloom Prune"),
                    "location_label": plant.get("location_label", ""),
                    "due_date": prune_dt.strftime("%Y-%m-%d"),
                    "why": "CRITICAL: Blooms on OLD WOOD. Summer pruning allows plant to set next year's flower buds. Late winter pruning destroys all blooms.",
                    "how": knowledge.get("prune_rules")
                    or knowledge.get("prune_directions", "Cut spent flower heads down to the first pair of healthy plump buds."),
                    "done": False,
                    "priority": "high"
                })
                task_id += 1
            elif bloom_wood == "new_wood":
                # Prune dormant in late winter (2 weeks before last frost)
                prune_dt = last_frost - timedelta(days=14)
                tasks.append({
                    "id": f"task-{task_id}",
                    "plant_id": plant["id"],
                    "plant_name": plant["common_name"],
                    "plant_species": plant["species"],
                    "type": "prune",
                    "title": self._task_title(plant, "Early Spring Hard Prune"),
                    "location_label": plant.get("location_label", ""),
                    "due_date": prune_dt.strftime("%Y-%m-%d"),
                    "why": "Blooms on NEW WOOD. Heavy dormant pruning encourages vigorous new flowering canes for summer.",
                    "how": knowledge.get("prune_rules")
                    or knowledge.get("prune_directions", "Cut canes back by one-third at a 45-degree angle just above outward-facing bud."),
                    "done": False,
                    "priority": "normal"
                })
                task_id += 1
            elif plant.get("care_category") == "vegetable":
                prune_dt = datetime(current_year, 6, 15)
                tasks.append({
                    "id": f"task-{task_id}",
                    "plant_id": plant["id"],
                    "plant_name": plant["common_name"],
                    "plant_species": plant["species"],
                    "type": "prune",
                    "title": self._task_title(plant, "Pinch Suckers on"),
                    "location_label": plant.get("location_label", ""),
                    "due_date": prune_dt.strftime("%Y-%m-%d"),
                    "why": "Channel vegetative energy into fruit trusses and remove low leaves touching soil.",
                    "how": knowledge.get("prune_rules", "Snap off 2-inch suckers growing in leaf axils with your fingers."),
                    "done": False,
                    "priority": "normal"
                })
                task_id += 1

            prop_technique = (
                knowledge.get("propagation_technique") or plant.get("propagation_technique") or ""
            ).strip()
            prop_window = (
                knowledge.get("propagation_window") or plant.get("propagation_window") or ""
            ).strip()
            seed_window = (
                knowledge.get("seed_germination_window") or plant.get("seed_germination_window") or ""
            ).strip()
            seed_primary = propagation_is_seed_primary(prop_technique)

            if prop_window and prop_technique and not seed_primary:
                prop_dt = due_date_from_season_window(prop_window, current_year)
                tasks.append({
                    "id": f"task-{task_id}",
                    "plant_id": plant["id"],
                    "plant_name": plant["common_name"],
                    "plant_species": plant["species"],
                    "type": "propagate",
                    "title": self._task_title(plant, "Propagate"),
                    "location_label": plant.get("location_label", ""),
                    "due_date": prop_dt.strftime("%Y-%m-%d"),
                    "why": f"Best propagation window for this plant: {prop_window}.",
                    "how": prop_technique,
                    "done": False,
                    "priority": "normal",
                })
                task_id += 1

            seed_schedule_text = seed_window or (prop_window if seed_primary else "")
            if seed_schedule_text.strip() and (seed_window or seed_primary):
                seed_dt = due_date_from_season_window(seed_schedule_text, current_year)
                tasks.append({
                    "id": f"task-{task_id}",
                    "plant_id": plant["id"],
                    "plant_name": plant["common_name"],
                    "plant_species": plant["species"],
                    "type": "seed",
                    "title": self._task_title(plant, "Sow seeds for"),
                    "location_label": plant.get("location_label", ""),
                    "due_date": seed_dt.strftime("%Y-%m-%d"),
                    "why": (
                        f"Seed sowing / germination window: {seed_schedule_text}."
                        if seed_schedule_text
                        else "Time to start seeds for this plant in your zone."
                    ),
                    "how": prop_technique or "Sow per packet or reference instructions for depth and indoor vs outdoor timing.",
                    "done": False,
                    "priority": "high" if plant.get("care_category") in ("vegetable", "annual") else "normal",
                })
                task_id += 1

            # 2. Feeding chore
            fert_dt = last_frost + timedelta(days=7)
            tasks.append({
                "id": f"task-{task_id}",
                "plant_id": plant["id"],
                "plant_name": plant["common_name"],
                "plant_species": plant["species"],
                "type": "fertilize",
                "title": self._task_title(plant, "Spring Feeding for"),
                "location_label": plant.get("location_label", ""),
                "due_date": fert_dt.strftime("%Y-%m-%d"),
                "why": "Support spring root flush and emerging vegetative buds.",
                "how": knowledge.get("fertilize_type", "Top-dress with balanced organic compost or slow-release granules."),
                "done": False,
                "priority": "normal"
            })
            task_id += 1

            # 3. Winterizing / Mulching chore
            mulch_dt = first_frost - timedelta(days=18)
            tasks.append({
                "id": f"task-{task_id}",
                "plant_id": plant["id"],
                "plant_name": plant["common_name"],
                "plant_species": plant["species"],
                "type": "mulch",
                "title": self._task_title(plant, "Winter Mulch & Root Protection for"),
                "location_label": plant.get("location_label", ""),
                "due_date": mulch_dt.strftime("%Y-%m-%d"),
                "why": "Prevents frost heave from ground freezing and preserves soil moisture during winter winds.",
                "how": knowledge.get("mulch_rules", "Apply 2-3 inches of coarse bark mulch. Keep clear of the main trunk."),
                "done": False,
                "priority": "high"
            })
            task_id += 1

        # Sort tasks chronologically
        tasks.sort(key=lambda t: t["due_date"])
        memory.set_tasks(tasks)
        return tasks

calendar_agent = CareCalendarAgent()
