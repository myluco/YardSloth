"""
Curated propagation priors for species where generic LLM advice is often wrong.
Injected into the plant profile prompt—not a full plant database.
"""

from typing import Optional

_EPILOBIUM_CANUM_PRIOR = (
    "California fuchsia (Epilobium canum): For home gardeners in mild California "
    "climates, the primary propagation methods are Seed (sow in early fall—September "
    "through October in zone 9—or in late spring) and Division of established clumps "
    "in early spring. Cuttings can work but are secondary; do NOT list semi-hardwood "
    "cuttings in late summer as the best or default method."
)

# Keys: lowercase scientific binomial or common name
SPECIES_PROPAGATION_PRIORS: dict[str, str] = {
    "epilobium canum": _EPILOBIUM_CANUM_PRIOR,
    "california fuchsia": _EPILOBIUM_CANUM_PRIOR,
}


def lookup_species_propagation_prior(
    plant_name: str, species_hint: Optional[str] = None
) -> tuple[str, Optional[str]]:
    """Return (prior text, matched key) or ("", None)."""
    candidates: list[str] = []
    if species_hint:
        candidates.append(species_hint.strip().lower())
    if plant_name:
        candidates.append(plant_name.strip().lower())

    for key in candidates:
        if key in SPECIES_PROPAGATION_PRIORS:
            return SPECIES_PROPAGATION_PRIORS[key], key

    for key in candidates:
        for prior_key, text in SPECIES_PROPAGATION_PRIORS.items():
            if prior_key in key or key in prior_key:
                return text, prior_key

    return "", None
