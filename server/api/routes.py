"""
server/api/routes.py

Pure Python API routes for Yard Sloth.
Delegates all intelligence to agents/ and retrieves state from agents/memory.
"""

import json
import sys
from datetime import datetime
from agents.main import pipeline
from agents.memory.agent_memory import memory
from agents.llm.ollama_client import OllamaError
from .ollama_errors import plant_care_error_response


def _ollama_error_hint(message: str) -> str | None:
    lower = message.lower()
    if "judge stack is not ready" in lower or "missing or unavailable" in lower:
        return "Pull every model listed in settings or update ollama_model_a/b and ollama_judge_model."
    if "http 503" in lower or "server busy" in lower:
        return (
            "Ollama is overloaded or serializing requests. Retry in a moment, or raise "
            "OLLAMA_NUM_PARALLEL / OLLAMA_MAX_LOADED_MODELS before starting Ollama."
        )
    if "cannot reach ollama" in lower:
        return "Start the Ollama app or `ollama serve` and confirm ollama_endpoint in settings."
    return None


def _run_calendar():
    try:
        return pipeline.run_calendar(), None
    except OllamaError as exc:
        return None, str(exc)


def handle_get_settings():
    return 200, memory.get_settings()


def handle_get_ollama_status():
    from agents.llm.ollama_client import check_ollama_status

    status = check_ollama_status()
    code = 200 if status.get("ok") else 503
    return code, status

def handle_post_settings(body: dict):
    if (
        isinstance(body.get("location_labels"), list)
        or isinstance(body.get("labels"), list)
        or body.get("rename")
        or body.get("yard_location_rename")
    ):
        return handle_update_yard_locations(body)

    # Climate fields are agent-derived only; clients may not override zip/zone/frost directly.
    allowed_without_geocode = {
        "units",
        "mock_frost_simulation",
        "ollama_endpoint",
        "ollama_model",
        "ollama_model_a",
        "ollama_model_b",
        "ollama_judge_model",
        "last_location_label",
        "yard_location_labels",
    }
    query = (body.get("address") or body.get("query") or "").strip() or None

    if query:
        geo = pipeline.mcp.call_tool("web_browse_geocode", {"query": query})
        current = memory.get_settings()
        resolved_address = (
            geo.get("formatted_address") or geo.get("address") or body.get("address") or query
        )
        memory.update_settings({
            "address": resolved_address,
            "formatted_address": resolved_address,
            "city": geo.get("city", query),
            "lat": geo.get("lat", 45.52),
            "lon": geo.get("lon", -122.68),
            "zone": geo.get("zone", "8b"),
            "temperature_range": geo.get("temperature_range", "15 to 20"),
            "first_frost": geo.get("first_fall_frost", "11-15"),
            "last_frost": geo.get("last_spring_frost", "03-15"),
            "zip": geo.get("zip", ""),
            "units": body.get("units", current.get("units", "F")),
        })
    else:
        patch = {k: body[k] for k in allowed_without_geocode if k in body}
        if patch:
            memory.update_settings(patch)

    _run_calendar()
    return 200, memory.get_settings()

def handle_lookup_location(body: dict):
    query = body.get("query", "").strip()
    lat = body.get("lat")
    lon = body.get("lon")

    if lat is not None and lon is not None:
        # Reverse lookup and USDA zone resolution
        geo_result = pipeline.mcp.browser.geocode_address_or_zip(f"{lat},{lon}")
        resolved_address = (
            geo_result.get("formatted_address")
            or geo_result.get("address")
            or geo_result.get("city", f"GPS ({lat:.2f}, {lon:.2f})")
        )
        memory.update_settings({
            "address": resolved_address,
            "formatted_address": resolved_address,
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
        resolved_address = geo.get("formatted_address") or geo.get("address") or query
        if geo.get("geocode_confidence") == "low":
            return 422, {
                "error": "Could not resolve that address. Try adding city and state, or use a ZIP code.",
                "query": query,
            }
        new_settings = {
            "address": resolved_address,
            "formatted_address": resolved_address,
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

    _run_calendar()
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
        memory.remember_yard_location_label(plant.get("location_label", ""))
        memory.persist()
        tasks, err = _run_calendar()
        if err:
            return 503, {"error": err, "plant": plant, "success": False}
        return 200, {"success": True, "plant": plant, "tasksCount": len(tasks)}
    return 400, {"error": "Candidate not found"}


def handle_update_yard_locations(body: dict):
    rename = body.get("rename") or body.get("yard_location_rename") or {}
    if rename and not isinstance(rename, dict):
        return 400, {"error": "rename must be an object mapping old labels to new labels."}
    if rename:
        memory.apply_yard_location_renames(rename)

    plant_id = body.get("plant_id")
    location_labels = body.get("location_labels")
    location_label = (body.get("location_label") or "").strip()

    if plant_id:
        if location_labels is not None:
            if not isinstance(location_labels, list) or not location_labels:
                return 400, {"error": "location_labels must be a non-empty array."}
            clean_labels = []
            seen = set()
            for item in location_labels:
                lab = " ".join(str(item).split())
                if lab and lab not in seen:
                    seen.add(lab)
                    clean_labels.append(lab)
            if not clean_labels:
                return 400, {"error": "Select at least one yard location for this plant."}
            plant = memory.update_plant(
                plant_id,
                {"location_labels": clean_labels, "location_label": clean_labels[0]},
            )
        elif location_label:
            plant = memory.update_plant(
                plant_id,
                {"location_labels": [location_label], "location_label": location_label},
            )
        else:
            return 400, {"error": "location_labels or location_label is required when plant_id is set."}
        if not plant:
            return 404, {"error": "Plant not found"}
    elif location_label:
        memory.remember_yard_location_label(location_label)
        memory.rebuild_yard_location_labels_from_plants()
        memory.persist()

    tasks, err = _run_calendar()
    payload = {
        "success": True,
        "settings": memory.get_settings(),
        "plants": memory.get_plants(),
        "candidates": memory.get_candidates(),
        "tasks": tasks or memory.get_tasks(),
    }
    if err:
        return 503, {**payload, "error": err}
    return 200, payload


def handle_update_plant(plant_id: str, body: dict):
    allowed = {"location_label", "location_labels", "common_name", "species", "notes"}
    updates = {k: body[k] for k in allowed if k in body}
    if not updates:
        return 400, {"error": "No valid plant fields to update."}
    plant = memory.update_plant(plant_id, updates)
    if not plant:
        return 404, {"error": "Plant not found"}
    tasks, err = _run_calendar()
    if err:
        return 503, {"error": err, "plant": plant, "success": False}
    return 200, {"success": True, "plant": plant, "tasks": tasks}


def handle_post_update_plant(body: dict):
    plant_id = body.get("plant_id")
    if not plant_id:
        return 400, {"error": "plant_id is required."}
    return handle_update_plant(str(plant_id), body)


def handle_refresh_plant_care(body: dict):
    plant_id = body.get("plant_id")
    if not plant_id:
        return 400, {"error": "plant_id is required."}
    try:
        plant = memory.refresh_plant_care_from_ollama(str(plant_id))
    except ValueError as exc:
        return 404, {"error": str(exc), "success": False, "failed_stage": "plant_care"}
    except (OllamaError, RuntimeError, Exception) as exc:
        status, error_type, err_text = plant_care_error_response(exc)
        print(
            f"[YardSloth API] POST /api/plants/refresh {status} plant_care [{error_type}]: {err_text}",
            file=sys.stderr,
        )
        payload = {
            "error": err_text,
            "success": False,
            "failed_stage": "plant_care",
            "error_type": error_type,
            "http_status": status,
        }
        if status == 503:
            payload["hint"] = _ollama_error_hint(err_text)
        return status, payload
    tasks, err = _run_calendar()
    warnings = plant.get("llm_warnings") if isinstance(plant.get("llm_warnings"), list) else []
    payload = {
        "success": True,
        "plant_care_ok": True,
        "plant": plant,
        "tasks": tasks or memory.get_tasks(),
        "warnings": warnings,
    }
    if err:
        payload["calendar_error"] = err
        payload["partial"] = True
        payload["failed_stage"] = "calendar"
        return 207, payload
    if warnings:
        return 207, {**payload, "partial": True}
    return 200, payload


def handle_refresh_all_plants_care():
    refreshed_ids, refresh_errors = memory.refresh_all_plants_care_from_ollama()
    tasks, cal_err = _run_calendar()
    payload = {
        "success": len(refresh_errors) == 0,
        "plants": memory.get_plants(),
        "tasks": tasks or memory.get_tasks(),
        "refreshed_count": len(refreshed_ids),
        "refreshed_ids": refreshed_ids,
        "errors": refresh_errors,
    }
    if cal_err:
        payload["calendar_error"] = cal_err
    if not refreshed_ids and refresh_errors:
        return 503, {**payload, "error": refresh_errors[0].get("error", "Refresh failed")}
    if refresh_errors:
        return 207, payload
    if cal_err:
        return 503, {**payload, "error": cal_err}
    return 200, payload


def handle_delete_candidate(cand_id: str):
    memory.remove_candidate(cand_id)
    return 200, {"success": True}

def handle_delete_plant(plant_id: str):
    memory.delete_plant(plant_id)
    _run_calendar()
    return 200, {"success": True}

def handle_identify_plant(body: dict):
    location_label = body.get("location_label", "Front bed")
    sample_species = (body.get("sample_species") or body.get("plant_name") or "").strip() or None
    image_base64 = body.get("image_base64")
    if not sample_species:
        return 400, {"error": "Plant name is required (common or scientific name)."}
    try:
        candidate = pipeline.run_census(location_label, sample_species, image_base64)
        memory.remember_yard_location_label(location_label)
        memory.persist()
    except OllamaError as e:
        return 503, {"error": str(e)}
    except ValueError as e:
        return 400, {"error": str(e)}
    return 200, {"candidate": candidate, "settings": memory.get_settings()}

def handle_get_tasks():
    tasks = memory.get_tasks()
    if not tasks:
        tasks, err = _run_calendar()
        if err:
            return 503, {"error": err, "tasks": []}
    return 200, {"tasks": tasks}

def handle_generate_tasks():
    tasks, err = _run_calendar()
    if err:
        return 503, {"error": err, "success": False, "tasks": []}
    return 200, {"success": True, "tasks": tasks}

def handle_toggle_task(task_id: str):
    task = memory.toggle_task(task_id)
    if task:
        return 200, {"success": True, "task": task}
    return 404, {"error": "Task not found"}

def handle_get_forecast():
    status = pipeline.run_frost_watch()
    return 200, status


def handle_get_evening_checklist():
    return 200, pipeline.get_evening_checklist_cached()


def handle_post_evening_checklist():
    return 200, pipeline.run_evening_checklist(force_refresh=True)


def handle_patch_evening_checklist_checked(body):
    checked = body.get("checked") if isinstance(body, dict) else None
    if not isinstance(checked, dict):
        return 400, {"error": "checked object required"}
    snapshot = memory.update_evening_checklist_checked(
        {str(k): bool(v) for k, v in checked.items()}
    )
    if not snapshot:
        return 404, {"error": "No tonight suggestions saved for today"}
    return 200, snapshot

def handle_toggle_simulation():
    settings = memory.get_settings()
    new_val = not settings.get("mock_frost_simulation", False)
    memory.update_settings({"mock_frost_simulation": new_val})
    memory.clear_evening_checklist_daily()
    status = pipeline.run_frost_watch()
    return 200, {
        "mock_frost_simulation": new_val,
        "forecast": status.get("forecast"),
        "alert": status.get("alert"),
        "simulationActive": new_val,
    }

def handle_export_ics():
    tasks = memory.get_tasks()
    if not tasks:
        tasks, err = _run_calendar()
        if err:
            return 503, json.dumps({"error": err}), "application/json"

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
