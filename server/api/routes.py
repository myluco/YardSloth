"""
server/api/routes.py

Pure Python API routes for Yard Sloth.
Delegates all intelligence to agents/ and retrieves state from agents/memory.
"""

import json
from datetime import datetime
from agents.main import pipeline
from agents.memory.agent_memory import memory

def handle_get_settings():
    return 200, memory.get_settings()

def handle_post_settings(body: dict):
    updated = memory.update_settings(body)
    # If address or zip changed, query MCP for updated frost dates & coordinates
    query = body.get("address") or body.get("zip")
    if query:
        geo = pipeline.mcp.call_tool("web_browse_geocode", {"query": query})
        memory.update_settings({
            "city": geo.get("city", "Portland, Oregon"),
            "lat": geo.get("lat", 45.52),
            "lon": geo.get("lon", -122.68),
            "zone": geo.get("zone", "8b"),
            "temperature_range": geo.get("temperature_range", "15 to 20"),
            "first_frost": geo.get("first_fall_frost", "11-15"),
            "last_frost": geo.get("last_spring_frost", "03-15"),
            "zip": geo.get("zip", body.get("zip", ""))
        })
    # Recalculate calendar
    pipeline.run_calendar()
    return 200, memory.get_settings()

def handle_lookup_location(body: dict):
    query = body.get("query", "").strip()
    lat = body.get("lat")
    lon = body.get("lon")

    if lat is not None and lon is not None:
        # Reverse lookup and USDA zone resolution
        geo_result = pipeline.mcp.browser.geocode_address_or_zip(f"{lat},{lon}")
        memory.update_settings({
            "address": geo_result.get("city", f"GPS ({lat:.2f}, {lon:.2f})"),
            "city": geo_result.get("city", f"GPS ({lat:.2f}, {lon:.2f})"),
            "lat": float(lat),
            "lon": float(lon),
            "zone": geo_result.get("zone", "8b"),
            "temperature_range": geo_result.get("temperature_range", "15 to 20"),
            "first_frost": geo_result.get("first_fall_frost", "11-15"),
            "last_frost": geo_result.get("last_spring_frost", "03-15"),
            "zip": geo_result.get("zip", "")
        })
    elif query:
        geo = pipeline.mcp.call_tool("web_browse_geocode", {"query": query})
        new_settings = {
            "address": query,
            "city": geo.get("city", query),
            "lat": geo.get("lat", 45.52),
            "lon": geo.get("lon", -122.68),
            "zone": geo.get("zone", "8b"),
            "temperature_range": geo.get("temperature_range", "15 to 20"),
            "first_frost": geo.get("first_fall_frost", "11-15"),
            "last_frost": geo.get("last_spring_frost", "03-15"),
            "zip": geo.get("zip", query if (query.isdigit() and len(query) == 5) else "")
        }
        memory.update_settings(new_settings)

    pipeline.run_calendar()
    return 200, memory.get_settings()

def handle_get_plants():
    return 200, {
        "plants": memory.get_plants(),
        "candidates": memory.get_candidates()
    }

def handle_post_confirm_plant(body: dict):
    candidate_id = body.get("candidateId")
    edited_data = body.get("editedData", {})
    plant = memory.confirm_candidate(candidate_id, edited_data)
    if plant:
        tasks = pipeline.run_calendar()
        return 200, {"success": True, "plant": plant, "tasksCount": len(tasks)}
    return 400, {"error": "Candidate not found"}

def handle_delete_candidate(cand_id: str):
    memory.remove_candidate(cand_id)
    return 200, {"success": True}

def handle_delete_plant(plant_id: str):
    memory.delete_plant(plant_id)
    pipeline.run_calendar()
    return 200, {"success": True}

def handle_identify_plant(body: dict):
    location_label = body.get("location_label", "Front bed")
    sample_species = body.get("sample_species")
    image_base64 = body.get("image_base64")
    candidate = pipeline.run_census(location_label, sample_species, image_base64)
    return 200, {"candidate": candidate}

def handle_get_tasks():
    tasks = memory.get_tasks()
    if not tasks:
        tasks = pipeline.run_calendar()
    return 200, {"tasks": tasks}

def handle_generate_tasks():
    tasks = pipeline.run_calendar()
    return 200, {"success": True, "tasks": tasks}

def handle_toggle_task(task_id: str):
    task = memory.toggle_task(task_id)
    if task:
        return 200, {"success": True, "task": task}
    return 404, {"error": "Task not found"}

def handle_get_forecast():
    status = pipeline.run_frost_watch()
    return 200, status

def handle_toggle_simulation():
    settings = memory.get_settings()
    new_val = not settings.get("mock_frost_simulation", True)
    memory.update_settings({"mock_frost_simulation": new_val})
    return 200, {"mock_frost_simulation": new_val}

def handle_export_ics():
    tasks = memory.get_tasks()
    if not tasks:
        tasks = pipeline.run_calendar()

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Yard Sloth//Garden Care Calendar (Python Server)//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Yard Sloth Care Calendar",
    ]

    for task in tasks:
        dt = task["due_date"].replace("-", "")
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:yard-sloth-{task['id']}@yardsloth.local",
            f"DTSTART;VALUE=DATE:{dt}",
            f"DTEND;VALUE=DATE:{dt}",
            f"SUMMARY:🌱 {task['title']}",
            f"DESCRIPTION:{task['why']} - How: {task['how']}",
            "STATUS:CONFIRMED",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    return 200, "\r\n".join(lines), "text/calendar"
