"""
agents/agent/frost_agent.py

Frost Watch Agent.
Monitors live Open-Meteo meteorological stream via MCP tool,
and evaluates freeze hazards deterministically against plant thresholds.
"""

from datetime import datetime
from typing import Dict, Any, List
from agents.mcp.mcp_client import mcp_client
from agents.memory.agent_memory import memory

class FrostWatchAgent:
    def __init__(self):
        self.mcp = mcp_client

    def evaluate_frost_threat(self) -> Dict[str, Any]:
        """
        Executes Frost Watch workflow:
        1. Look up coordinates for current ZIP code via MCP
        2. Query live weather stream via MCP
        3. Deterministically cross-reference against tender plants
        4. Synthesize human-actionable evening alert
        """
        settings = memory.get_settings()
        plants = memory.get_plants()
        zip_code = settings.get("zip", "97201")
        address = settings.get("address") or zip_code
        is_simulated = settings.get("mock_frost_simulation", True)

        lat = settings.get("lat")
        lon = settings.get("lon")

        # If lat/lon not present, resolve via MCP geocoding
        if lat is None or lon is None:
            geo = self.mcp.call_tool("web_browse_geocode", {"query": address})
            lat = geo.get("lat", 45.51)
            lon = geo.get("lon", -122.68)
            settings["lat"] = lat
            settings["lon"] = lon
            settings["city"] = geo.get("city", "Portland, OR")
            settings["zone"] = geo.get("zone", "8")
        else:
            geo = {"city": settings.get("city", address)}

        # Fetch live meteorological data via MCP
        weather_res = self.mcp.call_tool("web_browse_weather", {"lat": lat, "lon": lon})
        daily = weather_res.get("data", {}).get("daily", {})

        dates = daily.get("time", [datetime.now().strftime("%Y-%m-%d")])
        min_temps = daily.get("temperature_2m_min", [45])
        max_temps = daily.get("temperature_2m_max", [65])
        apparent_mins = daily.get("apparent_temperature_min", [43])
        precip_probs = daily.get("precipitation_probability_max", [10])
        weather_codes = daily.get("weathercode", [0])

        forecast_list: List[Dict[str, Any]] = []
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for idx, date_str in enumerate(dates[:7]):
            d = datetime.strptime(date_str, "%Y-%m-%d")
            t_min = int(round(min_temps[idx])) if idx < len(min_temps) else 45
            t_max = int(round(max_temps[idx])) if idx < len(max_temps) else 65
            app_min = int(round(apparent_mins[idx])) if idx < len(apparent_mins) else t_min

            risk = "none"
            if t_min <= 28:
                risk = "hard_freeze"
            elif t_min <= 32:
                risk = "freeze_warning"
            elif t_min <= 36:
                risk = "tender_watch"

            code = weather_codes[idx] if idx < len(weather_codes) else 0
            condition = "Clear Sky"
            if 1 <= code <= 3:
                condition = "Partly Cloudy"
            elif code >= 50:
                condition = "Passing Rain"

            forecast_list.append({
                "date": date_str,
                "day_name": "Tonight" if idx == 0 else day_names[d.weekday()],
                "temp_max": t_max,
                "temp_min": t_min,
                "apparent_min": app_min,
                "precip_prob": int(round(precip_probs[idx])) if idx < len(precip_probs) else 10,
                "weather_code": code,
                "condition_text": condition,
                "frost_risk": risk
            })

        # Deterministic threat check for tonight
        actual_tonight_low = forecast_list[0]["temp_min"]
        # If user explicitly opted into sandbox test, evaluate against 31°F
        eval_temp = 31 if is_simulated else actual_tonight_low

        tender = [p for p in plants if p.get("frost_sensitivity") == "tender"]
        semi_hardy = [p for p in plants if p.get("frost_sensitivity") == "semi_hardy"]

        if eval_temp <= 28:
            severity = "danger"
            vulnerable = [p["common_name"] for p in plants]
            prefix = "[Simulation] " if is_simulated else ""
            alert_text = f"{prefix}Hard freeze alert tonight ({eval_temp}°F): Bring containers indoors and mulch root crowns."
            action = "Move all potted citrus into house or garage. Fasten heavy fleece blankets over outdoor vegetable beds."
        elif eval_temp <= 32:
            severity = "warning"
            vulnerable = [p["common_name"] for p in tender + semi_hardy]
            names_str = ", ".join(vulnerable[:3])
            prefix = "[Simulation] " if is_simulated else ""
            alert_text = f"{prefix}Frost alert tonight ({eval_temp}°F): Protect {names_str}{' and others' if len(vulnerable) > 3 else ''}."
            action = "Cover hydrangea flower buds with breathable frost fabric. Move potted lemon indoors before sundown."
        elif eval_temp <= 36 and len(tender) > 0:
            severity = "warning"
            vulnerable = [p["common_name"] for p in tender]
            prefix = "[Simulation] " if is_simulated else ""
            alert_text = f"{prefix}Tender watch tonight ({eval_temp}°F): Vulnerable plants ({', '.join(vulnerable)}) at risk."
            action = "Harvest remaining green tomatoes and shelter warm-season herbs."
        else:
            severity = "info"
            vulnerable = []
            alert_text = f"Garden safe tonight: Low around {eval_temp}°F. Sloths can sleep soundly."
            action = "No frost covering required. Temperatures remain above critical tissue freeze limits."

        alert = {
            "id": f"alert-{int(datetime.now().timestamp())}",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "text": alert_text,
            "severity": severity,
            "temp_min_f": eval_temp,
            "actual_temp_min_f": actual_tonight_low,
            "vulnerable_plants": vulnerable,
            "action_recommendation": action,
            "resolved": False,
            "created_at": datetime.now().isoformat()
        }

        return {
            "location": geo.get("city", settings.get("city", "Portland, Oregon")),
            "zip": zip_code,
            "forecast": forecast_list,
            "alert": alert,
            "simulationActive": is_simulated
        }

frost_agent = FrostWatchAgent()
