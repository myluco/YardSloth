"""
agents/assets/prompts.py

All Ollama system prompts and user-message templates for Yard Sloth agents.
"""

from typing import Any, Dict


def format_garden_context_block(settings: Dict[str, Any]) -> str:
    city = str(settings.get("city") or settings.get("address") or "").strip()
    zip_code = str(settings.get("zip") or "").strip()
    zone = str(settings.get("zone") or "").strip()
    last_frost = str(settings.get("last_frost") or "").strip()
    first_frost = str(settings.get("first_frost") or "").strip()

    lines: list[str] = []
    if city:
        lines.append(f'- Garden location: "{city}"')
    if zip_code:
        lines.append(f"- ZIP: {zip_code}")
    if zone:
        lines.append(f"- USDA hardiness zone: {zone}")
    if last_frost and first_frost:
        lines.append(
            f"- Typical frost dates (MM-DD): last spring ~{last_frost}, first fall ~{first_frost}"
        )
    if not lines:
        return "- Garden location: temperate US (zone not configured in app settings)"
    return "\n".join(lines)


# Bump when required JSON shape changes (invalidates Ollama profile cache entries).
PLANT_PROFILE_SCHEMA_VERSION = "8"


def normalize_extended_profile_value(value: Any) -> str:
    """Treat not-applicable placeholders as blank for storage and UI."""
    text = str(value or "").strip()
    if not text:
        return ""
    normalized = text.lower().replace("_", " ").replace("-", " ")
    normalized = " ".join(normalized.split())
    if normalized in {"not applicable", "n/a", "na", "none"}:
        return ""
    return text


PLANT_PROFILE_EXTENDED_FIELDS: dict[str, str] = {
    "propagation_technique": (
        'string — ALWAYS fill for every garden plant. Single best home method; start with one label: '
        "Seed | Softwood cutting | Semi-hardwood cutting | Hardwood cutting | "
        "Root cutting | Basal cutting | Division | Layering — then 1–2 sentences how-to. "
        "For cuttings, name wood stage. Never use multiple methods as equally best."
    ),
    "propagation_window": (
        "string — ALWAYS fill when propagation_technique is filled: calendar timing in THIS zone "
        "for that method only (months/weeks; tie cuttings to wood stage). Use empty string \"\" only "
        "if propagation_technique is empty."
    ),
    "seed_germination_window": (
        'string — sow/stratify timing in THIS zone ONLY when Seed is the best method; '
        'otherwise empty string ""'
    ),
    "flowering_period": (
        'string — bloom season (months) in THIS zone when flowers are a meaningful reason to grow the plant. '
        "Use empty string \"\" when blooms are absent OR insignificant (e.g. many fruit trees grown for "
        "fruit, leafy vegetables, hosta grown for foliage, grass). Do NOT write not applicable."
    ),
    "fruiting_period": (
        'string — harvest/ripening window in THIS zone when the plant is grown for edible or ornamental fruit. '
        'Use empty string "" for plants not grown for fruit (most ornamentals, foliage plants). '
        "Do NOT write not applicable."
    ),
}

# Back-compat alias
PLANT_PROFILE_OPTIONAL_FIELDS = PLANT_PROFILE_EXTENDED_FIELDS

PLANT_CARE_PROFILE_SYSTEM = (
    "You are a master gardener and botanist. Respond with a single JSON object only. "
    "Use accurate horticulture for US home gardens. Tailor frost_threshold_f, "
    "frost_sensitivity, mulch_rules, prune/fertilize windows, propagation timing, seed "
    "sowing, and flowering/fruiting periods to the user's garden location and USDA zone "
    "when provided. "
    "Propagation should include which propagation method is the best for the plant and the timing of that method in the user's garden."
    "Seed germination should include the timing of when to sow/stratify for the plant in the user's garden."
    "Flowering/fruiting periods should include the timing of when the plant flowers/fruits in the user's garden."
    "Frost sensitivity should include the frost sensitivity of the plant in the user's garden."
    "Frost threshold should include the frost threshold of the plant in the user's garden."
    "Mulch rules should include the mulch rules of the plant in the user's garden. It should be aware when a plant does not like to be with roots in a wet environment."
    "Prune directions should include the prune directions of the plant in the user's garden."
    "Prune window should include the prune window of the plant in the user's garden."
    "prune_directions must be plain-language guidance any homeowner can follow—never reduce "
    "pruning to a vague wood-age label alone. Pruning directions must be tailored to the user's garden location and USDA zone when provided "
    "and the plant. For instance, do not invent wood when a plant does not have any wood. "
    "bloom_wood is a hidden scheduling hint only (not shown to users): set old_wood or "
    "new_wood ONLY for woody shrubs/trees where flower buds form on prior-year vs "
    "current-year stems (e.g. many bigleaf hydrangeas = old_wood; panicle hydrangeas = "
    "new_wood). Use not_applicable for herbaceous perennials, soft-stem natives, annuals, "
    "herbs, grasses, and plants without a woody framework (e.g. California fuchsia)—do NOT "
    "assign new_wood as a default. "
    "Never invent a random plant: if the name is ambiguous, pick the most common garden "
    "species and set species accordingly. "
    "You MUST return every key listed in the user template. "
    "Always provide propagation_technique and propagation_window for every plant. "
    "For flowering_period and fruiting_period use empty string when irrelevant—never "
    '"not applicable" or placeholders. '
    "Propagation: one best method + timing; do not default to cuttings when division or seed "
    "is standard for the species. "
    "When reference excerpts are provided, treat them as primary evidence for "
    "propagation_technique, propagation_window, seed_germination_window, flowering_period, "
    "and fruiting_period. Do not contradict them without explicit reason in reasoning_summary."
)

PLANT_HORTICULTURE_BRIEF_JUDGE_SYSTEM = (
    "You are the judge between two horticultural research briefs. Merge them into one "
    "concise plain-text brief (max 400 words) for US home gardeners. Prefer claims "
    "supported by the reference excerpts when the excerpts are provided below. Resolve "
    "conflicts using sound native-plant and extension practice (Calscape, CNPS, LBJWC). "
    "For rhizomatous herbaceous perennials, prefer division or seed over cutting methods "
    "unless both briefs cite cuttings. Output plain text only—no JSON."
)

PLANT_PROFILE_JUDGE_SYSTEM = (
    "You are the judge between two JSON plant-care profile drafts. Output a single JSON "
    "object only, with exactly the same keys required by the gather step. You MUST "
    "include non-empty strings for fertilize_window, fertilize_type, mulch_rules, "
    "prune_directions, prune_window, prune_rules, propagation_technique, and "
    "propagation_window. Prefer fields aligned with reference excerpts when provided. "
    "Resolve conflicts using the stronger horticultural evidence; "
    "never omit or null out required keys."
)

EVENING_CHECKLIST_JUDGE_SYSTEM = (
    "You are the judge between two tonight yard checklists. Output JSON only with shape "
    '{"items": [{"id", "title", "description", "urgency"}]}. '
    "urgency must be urgent or optional on every item. Keep only steps for plants the user "
    "listed; merge duplicates; up to 12 items. urgent = weather-driven protection needed "
    "before sundown tonight. optional = nice-to-do if you have time, not mandatory. "
    "You MUST keep every optional item from either draft—do not drop general garden chores "
    "just because frost steps exist. Merge duplicate frost protection: at most ONE urgent "
    "cover/protect step per plant (combine multiple tomatoes into one step if needed)."
)

PLANT_HORTICULTURE_RESEARCH_SYSTEM = (
    "You are a horticultural researcher for US home gardeners. Synthesize the reference "
    "excerpts plus established guidance from public native-plant and extension sources "
    "(Calscape, CNPS, Lady Bird Johnson Wildflower Center, university cooperative extension, "
    "RHS, Missouri Botanical Garden) when excerpts are incomplete. "
    "Write plain text only (no JSON). Max 400 words. "
    "Cover: confirmed identity/species; growth habit (woody shrub vs herbaceous or rhizomatous "
    "perennial); single best propagation method and calendar timing for the user's zone; "
    "seed sowing/stratification timing when seed is best; flowering months; fruiting/harvest if "
    "relevant; brief pruning notes. "
    "For rhizomatous or mat-forming perennials, prefer division or seed over semi-hardwood or "
    "hardwood cuttings unless references support cuttings. "
    "For western US native perennials, timing often follows fall rains (early fall seed sowing). "
    "Label each claim as [excerpt] when directly supported by excerpts, or [horticulture] when "
    "from standard references."
)


def _plant_profile_extended_json_lines() -> str:
    return "\n".join(
        f'  "{key}": {description},' for key, description in PLANT_PROFILE_EXTENDED_FIELDS.items()
    )


def build_plant_horticulture_research_user_prompt(
    plant_name: str,
    species_hint: str,
    garden_context: str,
    research_excerpt: str,
    research_sources: list[str],
) -> str:
    sources_line = ", ".join(research_sources) if research_sources else "(none fetched)"
    excerpt_block = (
        research_excerpt.strip()
        if research_excerpt.strip()
        else "(No live excerpts were retrieved; rely on [horticulture] sources named in your instructions.)"
    )
    return f"""Plant: "{plant_name}"
Scientific name hint: "{species_hint}"

Garden context:
{garden_context}

Reference URLs consulted: {sources_line}

Reference excerpts:
{excerpt_block}
"""


def build_plant_horticulture_brief_judge_user_prompt(
    research_excerpt: str,
    research_sources: list[str],
    models: Any,
) -> str:
    sources_line = ", ".join(research_sources) if research_sources else "(none)"
    return f"""Reference URLs: {sources_line}

Reference excerpts:
{research_excerpt.strip() or "(none)"}

Below you will see two briefs from {models.model_a} and {models.model_b}. Merge them.
"""


def build_plant_profile_judge_user_prompt(
    plant_name: str,
    species_hint: str,
    research_excerpt: str,
    research_sources: list[str],
    models: Any,
) -> str:
    sources_line = ", ".join(research_sources) if research_sources else "(none)"
    return f"""Plant: "{plant_name}" / species hint: "{species_hint}"

Reference URLs: {sources_line}
Reference excerpts:
{research_excerpt.strip() or "(none)"}

Below you will see two JSON profile drafts from {models.model_a} and {models.model_b}.
Return one merged JSON profile.
"""


def build_evening_checklist_judge_user_prompt(
    models: Any,
    plant_names: list[str] | None = None,
) -> str:
    plants_line = ", ".join(plant_names) if plant_names else "(from the drafts)"
    return f"""User plants (only these): {plants_line}

Merge rules:
- At most ONE urgent frost/cover/protect/wrap step per plant. Never list the same plant twice for urgent frost protection.
- If you combine multiple plants in one urgent step, do NOT also list those plants in separate urgent frost steps.
- Keep all optional (nice-to-do) items from the drafts unless duplicate.

Below are two checklist JSON responses from {models.model_a} and {models.model_b}. Return one merged checklist JSON."""


def build_plant_care_profile_user_prompt(
    plant_name: str,
    species_hint: str,
    garden_context: str,
    research_excerpt: str = "",
    research_sources: list[str] | None = None,
) -> str:
    extended_field_lines = _plant_profile_extended_json_lines()
    sources = research_sources or []
    sources_line = ", ".join(sources) if sources else "(none fetched)"
    excerpt = research_excerpt.strip() or (
        "(No live excerpts were retrieved; use sound horticulture for the garden context.)"
    )
    research_block = f"""
Reference URLs consulted: {sources_line}

Reference excerpts (primary evidence—align propagation, bloom, and fruit fields with these):
{excerpt}
"""
    return f"""Plant lookup request:
- User label: "{plant_name}"
- Scientific name hint (may be empty): "{species_hint}"

User's garden (use for regional hardiness and seasonal timing language):
{garden_context}
{research_block}
Propagation, flowering, fruiting:
- propagation_technique + propagation_window: REQUIRED content for every plant (best method + when in this zone).
- seed_germination_window: only when Seed is the best method; else "".
- flowering_period: months in zone when bloom matters to gardeners; else "" (e.g. hosta, fruit-focused trees, leafy veg).
- fruiting_period: harvest window when grown for fruit; else "".
- Use "" for unused fields—never "not applicable", "N/A", or "none".

Return JSON with exactly these keys:
{{
  "common_name": string,
  "species": string (binomial or cultivar group),
  "bloom_wood": one of old_wood | new_wood | both | not_applicable (scheduling hint; see system rules),
  "prune_directions": string (primary gardener-facing pruning guide: woody vs herbaceous, when to cut, what to remove, bloom-habit warnings—e.g. hydrangea on old wood: prune soon after bloom, avoid late-winter hard cut),
  "prune_window": string,
  "prune_rules": string (short actionable bullet-style steps; may echo prune_directions),
  "fertilize_window": string,
  "fertilize_type": string,
  "mulch_rules": string,
  "frost_sensitivity": one of tender | semi_hardy | hardy,
  "frost_threshold_f": integer (night temperature °F when protection is needed for THIS garden's zone),
  "care_category": one of shrub | perennial | annual | fruit_tree | vegetable | herb | houseplant,
  "reasoning_summary": string (2-3 sentences: pruning habit if any, frost threshold, zone context—not bloom_wood jargon),
{extended_field_lines}
}}"""


EVENING_CHECKLIST_SYSTEM = (
    "You are the Yard Sloth Frost Watch tonight planner. Respond with JSON only. "
    "Suggest steps ONLY for plants the user listed—never generic chores. "
    "Always include BOTH kinds when relevant: (1) urgent frost/freeze protection before "
    "sundown, and (2) optional nice-to-do chores for today (harvest, tidy, water, prune) "
    "that are helpful but not required. Mark each item urgency urgent or optional. "
    "Do not label optional pruning, watering, or general care as urgent unless tonight's "
    "forecast forces it. Include at least 2 optional items when the plant list allows."
)


def build_evening_checklist_user_prompt(
    eval_low_f: int,
    simulation: bool,
    tonight_low_f: int,
    apparent_low_f: int,
    alert_text: str,
    action_summary: str,
    plants_block: str,
    garden_context: str,
    forecast_location: str = "",
) -> str:
    location_line = (
        f"- Forecast area: {forecast_location}\n" if forecast_location.strip() else ""
    )
    return f"""Tonight's weather context:
- Effective low for planning: {eval_low_f}°F (simulation={simulation})
- Forecast min: {tonight_low_f}°F, apparent min: {apparent_low_f}°F
{location_line}- Alert: {alert_text}
- Recommended action summary: {action_summary}

User's garden (home / yard location):
{garden_context}

User's confirmed yard plants:
{plants_block}

Return JSON:
{{
  "items": [
    {{
      "id": "short-unique-id",
      "title": "verb-led step",
      "description": "1-2 sentences, plant-specific",
      "urgency": "urgent" | "optional"
    }}
  ]
}}
Use up to 12 items. On frosty nights include urgent protection steps AND separate optional nice-to-do items (with urgency optional)."""
