"""Parse evening checklist JSON from Ollama."""

import json
import re
from typing import Any, Dict, List

from agents.llm.errors import OllamaError


def extract_checklist_items(text: str) -> List[Dict[str, Any]]:
    raw = text.strip()
    if not raw:
        raise OllamaError("Ollama returned an empty checklist response.")

    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        raw = fence.group(1)

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise OllamaError("Checklist response was not valid JSON.")

    data = json.loads(raw[start : end + 1])
    items = data.get("items")
    if not isinstance(items, list):
        raise OllamaError("Checklist JSON must include an items array.")

    clean: List[Dict[str, Any]] = []
    for idx, row in enumerate(items):
        if not isinstance(row, dict):
            continue
        title = str(row.get("title", "")).strip()
        desc = str(row.get("description", row.get("desc", ""))).strip()
        if not title:
            continue
        item_id = str(row.get("id", "")).strip() or f"evening-{idx + 1}"
        clean.append({"id": item_id, "title": title, "description": desc})
    if not clean:
        raise OllamaError("Checklist contained no usable items.")
    return clean[:12]
