"""
agents/memory/persistence.py

JSON file persistence for yard state (settings, plants, tasks, Ollama profile cache).
"""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

STATE_VERSION = 1


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_state_path() -> Path:
    override = os.environ.get("YARD_SLOTH_DATA_FILE", "").strip()
    if override:
        return Path(override).expanduser()
    return _project_root() / "data" / "yard_sloth.json"


def normalize_plant_cache_key(
    plant_name: str,
    species: Optional[str] = None,
    climate_scope: Optional[str] = None,
) -> str:
    raw = (species or plant_name or "").strip().lower()
    base = " ".join(raw.split())
    scope = " ".join((climate_scope or "").strip().lower().split())
    if scope:
        return f"{base}::{scope}"
    return base


def load_state(path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    file_path = path or default_state_path()
    if not file_path.is_file():
        return None
    try:
        with file_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("version") != STATE_VERSION:
            data["version"] = STATE_VERSION
        return data
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Failed to load yard state from {file_path}: {exc}")
        return None


def save_state(snapshot: Dict[str, Any], path: Optional[Path] = None) -> None:
    file_path = path or default_state_path()
    file_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {**snapshot, "version": STATE_VERSION}

    fd, tmp_name = tempfile.mkstemp(
        prefix="yard_sloth_", suffix=".json", dir=str(file_path.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        os.replace(tmp_name, file_path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise
