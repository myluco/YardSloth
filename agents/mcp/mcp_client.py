"""
agents/mcp/mcp_client.py

Model Context Protocol client dispatcher.
Wraps tools and provides standard tool calling interfaces for CrewAI agents.
"""

from typing import Dict, Any
from agents.mcp.web_browser_tool import mcp_browser

class MCPClient:
    def __init__(self):
        self.browser = mcp_browser

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch tool calls using Model Context Protocol semantics."""
        if tool_name == "web_browse_weather":
            lat = arguments.get("lat", 45.51)
            lon = arguments.get("lon", -122.68)
            return self.browser.browse_weather_forecast(lat, lon)

        elif tool_name in ["web_browse_frost_dates", "web_browse_geocode"]:
            query = arguments.get("query") or arguments.get("zip") or "Portland, OR"
            return self.browser.geocode_address_or_zip(query)

        elif tool_name == "web_browse_plant_care":
            plant_name = arguments.get("plant_name", "")
            species = arguments.get("species")
            if not str(plant_name).strip():
                return {"status": "error", "message": "plant_name is required for Ollama lookup"}
            return self.browser.browse_plant_care_knowledge(plant_name, species)

        else:
            return {"status": "error", "message": f"Unknown MCP tool: {tool_name}"}

mcp_client = MCPClient()
