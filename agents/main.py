"""
agents/main.py

CrewAI pipeline coordinator for Yard Sloth.
Orchestrates:
1. Plant Census Crew (Vision & botanical identification)
2. Care Calendar Crew (Pruning rules & leveled task scheduling)
3. Frost Watch Crew (Live meteorological monitoring & threshold checks)
All data is ephemeral in memory; tools browse the web via MCP.
"""

from agents.agent.census_agent import census_agent
from agents.agent.calendar_agent import calendar_agent
from agents.agent.frost_agent import frost_agent
from agents.agent.evening_checklist_agent import evening_checklist_agent
from agents.memory.agent_memory import memory
from agents.mcp.mcp_client import mcp_client

class YardSlothCrewPipeline:
    def __init__(self):
        self.census = census_agent
        self.calendar = calendar_agent
        self.frost = frost_agent
        self.memory = memory
        self.mcp = mcp_client

    def run_census(self, location_label: str, sample_species: str = None, image_base64: str = None):
        """Run Plant Census Agent to identify specimen."""
        return self.census.identify_plant(location_label, sample_species, image_base64)

    def run_calendar(self):
        """Run Care Calendar Agent to synthesize tasks."""
        return self.calendar.generate_calendar()

    def run_frost_watch(self):
        """Run Frost Watch Agent to evaluate tonight's freeze hazard."""
        return self.frost.evaluate_frost_threat()

    def run_evening_checklist(self):
        """On-demand evening checklist from user's plants + tonight's forecast."""
        return evening_checklist_agent.generate()

pipeline = YardSlothCrewPipeline()

if __name__ == "__main__":
    print("Initializing Yard Sloth CrewAI Pipeline...")
    # Initial run
    pipeline.run_calendar()
    status = pipeline.run_frost_watch()
    print("Frost Watch status:", status["alert"]["text"])
