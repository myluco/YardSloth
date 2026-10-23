"""Daily cache for tonight's yard suggestions."""

from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from typing import Any, Dict, Optional


def local_calendar_day() -> str:
    return date.today().isoformat()


def is_evening_checklist_fresh(snapshot: Optional[Dict[str, Any]]) -> bool:
    if not snapshot:
        return False
    return str(snapshot.get("calendar_day") or "") == local_calendar_day()


def normalize_evening_checklist_snapshot(
    snapshot: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not snapshot or not is_evening_checklist_fresh(snapshot):
        return None
    items = snapshot.get("items")
    if not isinstance(items, list):
        return None
    checked = snapshot.get("checked")
    if not isinstance(checked, dict):
        checked = {}
    return {
        "calendar_day": snapshot.get("calendar_day"),
        "generated_at": snapshot.get("generated_at"),
        "items": deepcopy(items),
        "source": snapshot.get("source"),
        "tonight_low_f": snapshot.get("tonight_low_f"),
        "message": snapshot.get("message"),
        "checked": {str(k): bool(v) for k, v in checked.items()},
        "from_cache": True,
    }
