"""
agents/memory/agent_memory.py

Zero-disk ephemeral in-memory storage for CrewAI agents.
Stores plant candidates, confirmed specimens, task schedule, and forecast session state.
No data is ever written to disk files.
"""

from typing import Dict, List, Any, Optional

class AgentMemory:
    def __init__(self):
        # In-memory transient state
        self._plants: List[Dict[str, Any]] = []
        self._candidates: List[Dict[str, Any]] = []
        self._tasks: List[Dict[str, Any]] = []
        self._forecast_cache: Optional[Dict[str, Any]] = None
        self._settings: Dict[str, Any] = {
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
            "mock_frost_simulation": False
        }
        self._seed_initial_plants()

    def _seed_initial_plants(self):
        """Initial in-memory garden plants for demonstration."""
        self._plants = [
            {
                "id": "p-1",
                "common_name": "Bigleaf Hydrangea",
                "species": "Hydrangea macrophylla",
                "genus": "Hydrangea",
                "location_label": "Front walkway border",
                "confidence": 0.94,
                "reasoning": "Opposite serrated ovate leaves with terminal mophead floral structure on previous season canes.",
                "bloom_wood": "old_wood",
                "frost_sensitivity": "semi_hardy",
                "frost_threshold_f": 32,
                "care_category": "shrub",
                "confirmed": True
            },
            {
                "id": "p-2",
                "common_name": "San Marzano Tomato",
                "species": "Solanum lycopersicum",
                "genus": "Solanum",
                "location_label": "Raised cedar box #1",
                "confidence": 0.98,
                "reasoning": "Compound pinnate foliage with gland-tipped hairs, distinct aroma, and tender yellow flower clusters.",
                "bloom_wood": "not_applicable",
                "frost_sensitivity": "tender",
                "frost_threshold_f": 36,
                "care_category": "vegetable",
                "confirmed": True
            },
            {
                "id": "p-3",
                "common_name": "Meyer Lemon",
                "species": "Citrus x meyeri",
                "genus": "Citrus",
                "location_label": "South deck container",
                "confidence": 0.96,
                "reasoning": "Glossy coriaceous leaves with narrowly winged petioles, highly sensitive to freezing temperatures.",
                "bloom_wood": "both",
                "frost_sensitivity": "tender",
                "frost_threshold_f": 34,
                "care_category": "fruit_tree",
                "confirmed": True
            },
            {
                "id": "p-4",
                "common_name": "Garden Rose",
                "species": "Rosa spp.",
                "genus": "Rosa",
                "location_label": "Walkway trellised arbor",
                "confidence": 0.92,
                "reasoning": "Thorny canes with alternate pinnate 5-leaflet leaves, repeat blooms on new season canes.",
                "bloom_wood": "new_wood",
                "frost_sensitivity": "semi_hardy",
                "frost_threshold_f": 28,
                "care_category": "shrub",
                "confirmed": True
            },
            {
                "id": "p-5",
                "common_name": "English Lavender",
                "species": "Lavandula angustifolia",
                "genus": "Lavandula",
                "location_label": "West terrace rockery",
                "confidence": 0.95,
                "reasoning": "Linear grey-green aromatic leaves on compact woody base, cold hardy.",
                "bloom_wood": "old_wood",
                "frost_sensitivity": "hardy",
                "frost_threshold_f": 20,
                "care_category": "herb",
                "confirmed": True
            }
        ]
        self._candidates = [
            {
                "id": "cand-1",
                "common_name": "Plantain Lily (Hosta)",
                "species": "Hosta spp.",
                "genus": "Hosta",
                "location_label": "East fence shade garden",
                "confidence": 0.88,
                "reasoning": "Broad cordate ribbed foliage in basal rosette.",
                "bloom_wood": "not_applicable",
                "frost_sensitivity": "hardy",
                "frost_threshold_f": 28,
                "care_category": "perennial",
                "confirmed": False
            }
        ]

    # Memory Accessors
    def get_plants(self) -> List[Dict[str, Any]]:
        return self._plants

    def get_candidates(self) -> List[Dict[str, Any]]:
        return self._candidates

    def add_candidate(self, candidate: Dict[str, Any]):
        self._candidates.insert(0, candidate)

    def remove_candidate(self, candidate_id: str):
        self._candidates = [c for c in self._candidates if c["id"] != candidate_id]

    def confirm_candidate(self, candidate_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cand = next((c for c in self._candidates if c["id"] == candidate_id), None)
        if cand:
            self._candidates = [c for c in self._candidates if c["id"] != candidate_id]
            new_plant = {**cand, **updates, "confirmed": True}
            self._plants.append(new_plant)
            return new_plant
        return None

    def delete_plant(self, plant_id: str):
        self._plants = [p for p in self._plants if p["id"] != plant_id]
        self._tasks = [t for t in self._tasks if t.get("plant_id") != plant_id]

    def get_tasks(self) -> List[Dict[str, Any]]:
        return self._tasks

    def set_tasks(self, tasks: List[Dict[str, Any]]):
        self._tasks = tasks

    def toggle_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        for task in self._tasks:
            if task["id"] == task_id:
                task["done"] = not task.get("done", False)
                return task
        return None

    def get_settings(self) -> Dict[str, Any]:
        return self._settings

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        self._settings.update(new_settings)
        return self._settings

# Global ephemeral memory instance
memory = AgentMemory()
