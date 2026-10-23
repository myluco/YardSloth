"""
Live horticultural reference excerpts for grounding Ollama plant profiles.
"""

import json
import re
import urllib.parse
import urllib.request
from html import unescape
from typing import Any, Dict, List, Optional, Tuple

_USER_AGENT = "YardSloth-MCP-Agent/1.0 (Horticultural Research Bot)"

_SECTION_KEYWORDS = (
    "cultivation",
    "propagation",
    "garden",
    "horticulture",
    "growing",
    "uses",
    "ecology",
    "description",
)


def _http_get(url: str, timeout: int = 12) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def _html_to_text(html: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.I | re.S)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _wikipedia_page_title_candidates(plant_name: str, species: Optional[str]) -> List[str]:
    titles: List[str] = []
    if species:
        titles.append(species.strip().replace(" ", "_"))
    if plant_name:
        titles.append(plant_name.strip().replace(" ", "_"))
    # Deduplicate while preserving order
    seen: set[str] = set()
    out: List[str] = []
    for title in titles:
        key = title.lower()
        if title and key not in seen:
            seen.add(key)
            out.append(title)
    return out


def _wikipedia_opensearch_title(query: str) -> Optional[str]:
    url = (
        "https://en.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode(
            {
                "action": "opensearch",
                "search": query,
                "limit": 1,
                "namespace": 0,
                "format": "json",
            }
        )
    )
    try:
        data = json.loads(_http_get(url))
        if len(data) >= 2 and data[1]:
            return str(data[1][0]).replace(" ", "_")
    except Exception as exc:
        print("Wikipedia opensearch failed:", exc)
    return None


def _wikipedia_sections(title: str) -> List[Tuple[str, str]]:
    url = (
        "https://en.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode(
            {"action": "parse", "page": title, "prop": "sections", "format": "json"}
        )
    )
    try:
        data = json.loads(_http_get(url))
        sections = data.get("parse", {}).get("sections", [])
        picked: List[Tuple[str, str]] = []
        for section in sections:
            line = str(section.get("line", ""))
            index = str(section.get("index", ""))
            if not index or not line:
                continue
            lower = line.lower()
            if any(keyword in lower for keyword in _SECTION_KEYWORDS):
                picked.append((index, line))
        return picked
    except Exception as exc:
        print(f"Wikipedia sections failed for {title}:", exc)
        return []


def _wikipedia_section_text(title: str, section_index: str) -> str:
    url = (
        "https://en.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode(
            {
                "action": "parse",
                "page": title,
                "section": section_index,
                "prop": "text",
                "format": "json",
            }
        )
    )
    try:
        data = json.loads(_http_get(url))
        html = data.get("parse", {}).get("text", {}).get("*", "")
        return _html_to_text(html)
    except Exception as exc:
        print(f"Wikipedia section {section_index} failed for {title}:", exc)
        return ""


def _wikipedia_article_extract(title: str, max_chars: int = 6500) -> str:
    url = (
        "https://en.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode(
            {
                "action": "query",
                "prop": "extracts",
                "explaintext": 1,
                "titles": title,
                "format": "json",
            }
        )
    )
    try:
        data = json.loads(_http_get(url))
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()), {})
        if page.get("missing"):
            return ""
        extract = str(page.get("extract", "")).strip()
        return extract[:max_chars]
    except Exception as exc:
        print(f"Wikipedia article failed for {title}:", exc)
        return ""


def _wikipedia_search_title(query: str) -> Optional[str]:
    url = (
        "https://en.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode(
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 1,
                "format": "json",
            }
        )
    )
    try:
        data = json.loads(_http_get(url))
        hits = data.get("query", {}).get("search", [])
        if hits:
            return str(hits[0].get("title", "")).replace(" ", "_")
    except Exception as exc:
        print("Wikipedia search failed:", exc)
    return None


def _wiki_page_url(title: str) -> str:
    return f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace('_', ' '), safe='')}"


def _gather_wikipedia_excerpts(plant_name: str, species: Optional[str]) -> Tuple[str, List[str]]:
    sources: List[str] = []
    blocks: List[str] = []

    titles = _wikipedia_page_title_candidates(plant_name, species)
    if plant_name and not titles:
        found = _wikipedia_opensearch_title(plant_name)
        if found:
            titles.append(found)

    resolved_title: Optional[str] = None
    for title in titles:
        article = _wikipedia_article_extract(title)
        if article:
            resolved_title = title
            sources.append(_wiki_page_url(title))
            blocks.append(f"=== Wikipedia: {title.replace('_', ' ')} ===\n{article}")
            break

    if not resolved_title:
        return "", []

    for index, heading in _wikipedia_sections(resolved_title):
        body = _wikipedia_section_text(resolved_title, index)
        if len(body) < 40:
            continue
        blocks.append(f"=== Wikipedia: {heading} (detail) ===\n{body[:2800]}")

    supplemental_queries = []
    if plant_name:
        supplemental_queries.append(f"{plant_name} propagation")
    if species:
        supplemental_queries.append(f"{species} horticulture")

    for query in supplemental_queries:
        extra_title = _wikipedia_search_title(query)
        if not extra_title or extra_title == resolved_title:
            continue
        extra_text = _wikipedia_article_extract(extra_title, max_chars=3500)
        if len(extra_text) < 120:
            continue
        sources.append(_wiki_page_url(extra_title))
        blocks.append(
            f"=== Wikipedia (related): {extra_title.replace('_', ' ')} ===\n{extra_text}"
        )
        break

    combined = "\n\n".join(blocks).strip()
    return combined[:12000], sources


def gather_plant_research(plant_name: str, species: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch public reference text to ground Ollama (Wikipedia today; more sources later).
    """
    excerpt, sources = _gather_wikipedia_excerpts(plant_name, species)
    status = "success" if excerpt else "no_references"
    return {
        "status": status,
        "excerpt": excerpt,
        "sources": sources,
    }
