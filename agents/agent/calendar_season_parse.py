"""Parse season windows from LLM text into calendar due dates."""

from __future__ import annotations

import re
from datetime import datetime

_MONTH_PATTERNS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(rf"\b{name}\b", re.I), num)
    for name, num in (
        ("january", 1),
        ("february", 2),
        ("march", 3),
        ("april", 4),
        ("may", 5),
        ("june", 6),
        ("july", 7),
        ("august", 8),
        ("september", 9),
        ("october", 10),
        ("november", 11),
        ("december", 12),
        ("jan", 1),
        ("feb", 2),
        ("mar", 3),
        ("apr", 4),
        ("jun", 6),
        ("jul", 7),
        ("aug", 8),
        ("sep", 9),
        ("sept", 9),
        ("oct", 10),
        ("nov", 11),
        ("dec", 12),
    )
]


def months_in_season_text(text: str) -> list[int]:
    if not (text or "").strip():
        return []
    found: set[int] = set()
    for pattern, month_num in _MONTH_PATTERNS:
        if pattern.search(text):
            found.add(month_num)
    return sorted(found)


def due_date_from_season_window(
    text: str,
    year: int,
    *,
    fallback_month: int = 4,
    fallback_day: int = 15,
) -> datetime:
    months = months_in_season_text(text)
    if not months:
        return datetime(year, fallback_month, fallback_day)
    mid_month = months[len(months) // 2]
    return datetime(year, mid_month, 15)


def propagation_is_seed_primary(technique: str) -> bool:
    t = (technique or "").strip().lower()
    if not t or "seed" not in t:
        return False
    if any(
        marker in t
        for marker in (
            "division",
            "cutting",
            "layer",
            "graft",
            "hardwood",
            "softwood",
            "semi-hardwood",
            "root cutting",
            "basal",
        )
    ):
        return False
    return t.startswith("seed") or t.split(":")[0].strip() == "seed"
