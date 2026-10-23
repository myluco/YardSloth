"""
agents/memory/agent_memory.py

In-memory garden state with JSON persistence across restarts.
"""

from copy import deepcopy
from datetime import datetime
from typing import Dict, List, Any, Optional

from agents.memory.persistence import (
    default_state_path,
    load_state,
    normalize_plant_cache_key,
    save_state,
)

def _normalize_location_label(label: str) -> str:
    return " ".join((label or "").split())


def plant_location_labels(plant: Dict[str, Any]) -> List[str]:
    multi = plant.get("location_labels")
    if isinstance(multi, list) and multi:
        out: List[str] = []
        seen: set = set()
        for item in multi:
            clean = _normalize_location_label(str(item))
            if clean and clean not in seen:
                seen.add(clean)
                out.append(clean)
        if out:
            return out
    single = _normalize_location_label(plant.get("location_label") or "")
    return [single] if single else []


def sync_plant_location_fields(plant: Dict[str, Any]) -> None:
    labels = plant_location_labels(plant)
    plant["location_labels"] = labels
    plant["location_label"] = labels[0] if labels else (plant.get("location_label") or "")


DEFAULT_SETTINGS: Dict[str, Any] = {
    "address": "Portland, OR",
    "zip": "97201",
    "city": "Portland, Oregon",
    "lat": 45.52,
    "lon": -122.68,
    "zone": "8b",
    "temperature_range": "15 to 20",
    "first_frost": "11-15",
    "last_frost": "03-15",
    "units": "F",
    "mock_frost_simulation": False,
    "ollama_endpoint": "http://localhost:11434",
    "ollama_model": "gemma4:31b-cloud",
    "ollama_model_a": "gemma4:31b-cloud",
    "ollama_model_b": "qwen2.5:14b",
    "ollama_judge_model": "llama3.1:8b",
    "last_location_label": "Front bed, left of steps",
    "yard_location_labels": [
        "Front bed, left of steps",
        "Cedar raised box #1",
        "South deck containers",
        "Walkway trellised arbor",
        "East fence shade border",
    ],
}


class AgentMemory:
    def __init__(self):
        self._plants: List[Dict[str, Any]] = []
        self._candidates: List[Dict[str, Any]] = []
        self._tasks: List[Dict[str, Any]] = []
        self._forecast_cache: Optional[Dict[str, Any]] = None
        self._settings: Dict[str, Any] = deepcopy(DEFAULT_SETTINGS)
        self._plant_knowledge_cache: Dict[str, Dict[str, Any]] = {}
        self._state_path = default_state_path()
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        stored = load_state(self._state_path)
        if not stored:
            return
        self._settings = {**deepcopy(DEFAULT_SETTINGS), **stored.get("settings", {})}
        raw_plants = list(stored.get("plants", []))
        raw_candidates = list(stored.get("candidates", []))
        self._plants = self._sanitize_plants(raw_plants)
        self._candidates = self._sanitize_candidates(raw_candidates)
        self._tasks = list(stored.get("tasks", []))
        self._plant_knowledge_cache = dict(stored.get("plant_knowledge_cache", {}))
        self.rebuild_yard_location_labels_from_plants()
        backfilled = self._backfill_care_refreshed_at(self._plants)
        backfilled |= self._backfill_care_refreshed_at(self._candidates)
        if (
            len(self._plants) != len(raw_plants)
            or len(self._candidates) != len(raw_candidates)
            or backfilled
        ):
            self.persist()
        print(f"Loaded yard state from {self._state_path}")

    def _backfill_care_refreshed_at(self, rows: List[Dict[str, Any]]) -> bool:
        changed = False
        stamp = datetime.now().isoformat(timespec="seconds")
        for row in rows:
            if not str(row.get("care_refreshed_at") or "").strip():
                row["care_refreshed_at"] = stamp
                changed = True
        return changed

    def _sanitize_candidates(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        clean: List[Dict[str, Any]] = []
        for row in rows:
            if not row.get("common_name") or not row.get("bloom_wood"):
                print(f"Skipping incomplete candidate record: {row.get('id', 'unknown')}")
                continue
            sync_plant_location_fields(row)
            clean.append(row)
        return clean

    def _sanitize_plants(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        clean: List[Dict[str, Any]] = []
        for row in rows:
            if not row.get("common_name") or not row.get("bloom_wood"):
                print(f"Skipping incomplete plant record: {row.get('id', 'unknown')}")
                continue
            sync_plant_location_fields(row)
            clean.append(row)
        return clean

    def _snapshot(self) -> Dict[str, Any]:
        return {
            "settings": self._settings,
            "plants": self._plants,
            "candidates": self._candidates,
            "tasks": self._tasks,
            "plant_knowledge_cache": self._plant_knowledge_cache,
        }

    def persist(self) -> None:
        save_state(self._snapshot(), self._state_path)

    def _plant_profile_climate_scope(self) -> str:
        from agents.assets.prompts import PLANT_PROFILE_SCHEMA_VERSION

        zone = str(self._settings.get("zone") or "").strip().lower()
        zip_code = str(self._settings.get("zip") or "").strip()
        parts = [p for p in (zone, zip_code) if p]
        parts.append(f"schema:{PLANT_PROFILE_SCHEMA_VERSION}")
        return "|".join(parts) if parts else f"unknown|schema:{PLANT_PROFILE_SCHEMA_VERSION}"

    def get_plant_knowledge_cache_key(self, plant_name: str, species: Optional[str] = None) -> str:
        return normalize_plant_cache_key(
            plant_name, species, climate_scope=self._plant_profile_climate_scope()
        )

    def get_cached_plant_profile(
        self, plant_name: str, species: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        key = self.get_plant_knowledge_cache_key(plant_name, species)
        hit = self._plant_knowledge_cache.get(key)
        return deepcopy(hit) if hit else None

    def set_cached_plant_profile(
        self, plant_name: str, species: Optional[str], profile: Dict[str, Any]
    ) -> None:
        key = self.get_plant_knowledge_cache_key(plant_name, species)
        self._plant_knowledge_cache[key] = deepcopy(profile)
        self.persist()

    def clear_cached_plant_profile(
        self, plant_name: str, species: Optional[str] = None
    ) -> None:
        key = self.get_plant_knowledge_cache_key(plant_name, species)
        if key in self._plant_knowledge_cache:
            del self._plant_knowledge_cache[key]
            self.persist()

    def refresh_plant_care_from_ollama(self, plant_id: str) -> Dict[str, Any]:
        from agents.plant_profile import refresh_plant_record_from_ollama

        plant = next((p for p in self._plants if p["id"] == plant_id), None)
        if not plant:
            raise ValueError("Plant not found")
        refresh_plant_record_from_ollama(plant, skip_cache=True)
        self.persist()
        return plant

    def refresh_all_plants_care_from_ollama(self) -> tuple[List[str], List[Dict[str, Any]]]:
        from agents.llm.ollama_client import OllamaError
        from agents.plant_profile import refresh_plant_record_from_ollama

        refreshed_ids: List[str] = []
        errors: List[Dict[str, Any]] = []
        for plant in list(self._plants):
            try:
                refresh_plant_record_from_ollama(plant, skip_cache=True)
                refreshed_ids.append(plant["id"])
            except (OllamaError, RuntimeError) as exc:
                errors.append(
                    {
                        "plant_id": plant.get("id"),
                        "common_name": plant.get("common_name"),
                        "error": str(exc),
                    }
                )
            except ValueError as exc:
                errors.append(
                    {
                        "plant_id": plant.get("id"),
                        "common_name": plant.get("common_name"),
                        "error": str(exc),
                    }
                )
        if refreshed_ids:
            self.persist()
        return refreshed_ids, errors

    def get_plants(self) -> List[Dict[str, Any]]:
        return self._plants

    def get_candidates(self) -> List[Dict[str, Any]]:
        return self._candidates

    def add_candidate(self, candidate: Dict[str, Any]):
        self._candidates.insert(0, candidate)
        self.persist()

    def remove_candidate(self, candidate_id: str):
        self._candidates = [c for c in self._candidates if c["id"] != candidate_id]
        self.persist()

    def confirm_candidate(self, candidate_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cand = next((c for c in self._candidates if c["id"] == candidate_id), None)
        if cand:
            self._candidates = [c for c in self._candidates if c["id"] != candidate_id]
            new_plant = {**cand, **updates, "confirmed": True}
            sync_plant_location_fields(new_plant)
            self._plants.append(new_plant)
            self.rebuild_yard_location_labels_from_plants()
            self.persist()
            return new_plant
        return None

    def delete_plant(self, plant_id: str):
        self._plants = [p for p in self._plants if p["id"] != plant_id]
        self._tasks = [t for t in self._tasks if t.get("plant_id") != plant_id]
        self.rebuild_yard_location_labels_from_plants()
        self.persist()

    def update_plant(self, plant_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for plant in self._plants:
            if plant["id"] == plant_id:
                plant.update(updates)
                if "location_labels" in updates or "location_label" in updates:
                    sync_plant_location_fields(plant)
                    labels = plant_location_labels(plant)
                    if labels:
                        self._settings["last_location_label"] = labels[-1]
                self.rebuild_yard_location_labels_from_plants()
                self.persist()
                return plant
        return None

    def rebuild_yard_location_labels_from_plants(self) -> None:
        labels: List[str] = []
        seen: set = set()
        for row in self._plants + self._candidates:
            for lab in plant_location_labels(row):
                if lab not in seen:
                    seen.add(lab)
                    labels.append(lab)
        self._settings["yard_location_labels"] = labels[:24]

    def remember_yard_location_label(self, label: str) -> None:
        clean = " ".join((label or "").split())
        if not clean:
            return
        labels = list(self._settings.get("yard_location_labels") or [])
        if clean not in labels:
            labels.insert(0, clean)
        self._settings["yard_location_labels"] = labels[:24]
        self._settings["last_location_label"] = clean

    def apply_yard_location_renames(self, rename_map: Optional[Dict[str, str]] = None) -> None:
        if rename_map:
            for old, new in rename_map.items():
                old_st = _normalize_location_label(old)
                new_st = _normalize_location_label(new)
                if not old_st or not new_st or old_st == new_st:
                    continue
                for plant in self._plants + self._candidates:
                    labs = plant_location_labels(plant)
                    plant["location_labels"] = [
                        new_st if _normalize_location_label(lab) == old_st else lab for lab in labs
                    ]
                    sync_plant_location_fields(plant)
        self.rebuild_yard_location_labels_from_plants()
        self.persist()

    def apply_yard_location_catalog(
        self,
        labels: List[str],
        rename_map: Optional[Dict[str, str]] = None,
    ) -> None:
        self.apply_yard_location_renames(rename_map)

    def get_tasks(self) -> List[Dict[str, Any]]:
        return self._tasks

    def set_tasks(self, tasks: List[Dict[str, Any]]):
        self._tasks = tasks
        self.persist()

    def toggle_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        for task in self._tasks:
            if task["id"] == task_id:
                task["done"] = not task.get("done", False)
                self.persist()
                return task
        return None

    def get_settings(self) -> Dict[str, Any]:
        return self._settings

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        self._settings.update(new_settings)
        self.persist()
        return self._settings


memory = AgentMemory()
