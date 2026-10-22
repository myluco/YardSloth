import { PlantCandidate } from './types';

export type YardLocationRow = {
  id: string;
  original: string;
  value: string;
};

export function normalizeLocationLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

export function getPlantLocationLabels(plant: PlantCandidate): string[] {
  const multi = plant.location_labels;
  if (Array.isArray(multi) && multi.length > 0) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of multi) {
      const clean = normalizeLocationLabel(String(item));
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
      }
    }
    if (out.length > 0) return out;
  }
  const single = normalizeLocationLabel(plant.location_label || '');
  return single ? [single] : [];
}

export function formatPlantLocations(plant: PlantCandidate): string {
  return getPlantLocationLabels(plant).join(' · ');
}

/** Labels currently assigned to at least one plant or candidate (no unused presets). */
export function collectInUseLocationLabels(
  plants: PlantCandidate[],
  candidates: PlantCandidate[] = []
): string[] {
  const labels = new Set<string>();
  for (const plant of [...plants, ...candidates]) {
    for (const label of getPlantLocationLabels(plant)) {
      labels.add(label);
    }
  }
  return Array.from(labels);
}

export function mergeYardLocationLabels(
  plants: PlantCandidate[],
  candidates: PlantCandidate[] = []
): string[] {
  return collectInUseLocationLabels(plants, candidates);
}

export function buildLocationRows(labels: string[]): YardLocationRow[] {
  return labels.map((label) => ({
    id: `loc-${label}`,
    original: label,
    value: label,
  }));
}

export function buildRenameMap(rows: YardLocationRow[]): Record<string, string> {
  const rename: Record<string, string> = {};
  for (const row of rows) {
    const next = row.value.trim();
    const prev = row.original.trim();
    if (prev && next && prev !== next) {
      rename[prev] = next;
    }
  }
  return rename;
}
