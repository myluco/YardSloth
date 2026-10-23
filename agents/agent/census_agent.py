"""
agents/agent/census_agent.py

Plant Census Agent implementation.
Uses MCP web browsing tool to cross-reference plant traits and returns structured candidate models.
"""

import time
from typing import Dict, Any, Optional
from agents.mcp.mcp_client import mcp_client
from agents.memory.agent_memory import memory
from agents.assets.prompts import PLANT_PROFILE_EXTENDED_FIELDS
from agents.plant_profile import stamp_care_refreshed_at

class PlantCensusAgent:
    def __init__(self):
        self.mcp = mcp_client

    def identify_plant(
        self,
        location_label: str,
        sample_species: Optional[str] = None,
        image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes Census Agent workflow:
        1. Analyzes photo or species query
        2. Calls MCP Web Browser to retrieve live botanical profile
        3. Constructs structured PlantCandidate
        """
        query_name = (sample_species or "").strip()
        if not query_name:
            raise ValueError("Plant name is required (common or scientific name).")

        knowledge = self.mcp.call_tool("web_browse_plant_care", {
            "plant_name": query_name,
            "species": sample_species
        })
        if knowledge.get("status") == "error":
            raise ValueError(knowledge.get("message", "Plant care lookup failed"))

        has_photo = bool(image_base64 and str(image_base64).strip())
        llm_reason = knowledge.get("reasoning_summary") or knowledge.get("source", "Ollama")
        if has_photo:
            reasoning = (
                f"User supplied “{query_name}” with a yard photo at {location_label or 'Yard walk find'}. "
                f"{llm_reason}"
            )
            confidence = 0.91
        else:
            reasoning = f"User supplied plant name “{query_name}”. {llm_reason}"
            confidence = 0.88

        candidate = {
            "id": f"cand-{int(time.time() * 1000)}",
            "common_name": knowledge.get("common_name", query_name.title()),
            "species": knowledge.get("species", f"{query_name.title()} spp."),
            "genus": knowledge.get("species", query_name).split(" ")[0],
            "location_label": location_label or "Yard walk find",
            "location_labels": [location_label or "Yard walk find"],
            "confidence": confidence,
            "reasoning": reasoning,
            "bloom_wood": knowledge.get("bloom_wood", "not_applicable"),
            "prune_directions": knowledge.get("prune_directions", ""),
            "frost_sensitivity": knowledge.get("frost_sensitivity", "semi_hardy"),
            "frost_threshold_f": knowledge.get("frost_threshold_f", 32),
            "care_category": knowledge.get("care_category", "shrub"),
            "confirmed": False,
            "source": knowledge.get("source", "mcp_browser")
        }
        if has_photo:
            candidate["photo_url"] = image_base64

        for field in (
            "prune_directions",
            "prune_window",
            "prune_rules",
            "fertilize_window",
            "fertilize_type",
            "mulch_rules",
            "reasoning_summary",
            *PLANT_PROFILE_EXTENDED_FIELDS.keys(),
        ):
            if knowledge.get(field):
                candidate[field] = knowledge[field]

        stamp_care_refreshed_at(candidate)
        memory.add_candidate(candidate)
        return candidate

census_agent = PlantCensusAgent()
