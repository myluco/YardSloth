export type BloomWoodType = 'old_wood' | 'new_wood' | 'both' | 'not_applicable';
export type FrostSensitivity = 'tender' | 'semi_hardy' | 'hardy';
export type CareCategory = 'shrub' | 'perennial' | 'annual' | 'fruit_tree' | 'vegetable' | 'herb' | 'houseplant';

export interface PlantCandidate {
  id: string;
  photo_url?: string;
  location_label: string;
  /** All yard spots where this plant record appears (same species can span multiple labels). */
  location_labels?: string[];
  common_name: string;
  species: string;
  genus: string;
  confidence: number;
  reasoning: string;
  bloom_wood: BloomWoodType;
  frost_sensitivity: FrostSensitivity;
  frost_threshold_f: number;
  care_category: CareCategory;
  confirmed: boolean;
  notes?: string;
  created_at?: string;
  /** ISO timestamp when Ollama care profile was last fetched for this record. */
  care_refreshed_at?: string;
  source?: string;
  /** Gardener-facing when/how to prune (preferred over bloom_wood labels). */
  prune_directions?: string;
  prune_window?: string;
  prune_rules?: string;
  fertilize_window?: string;
  fertilize_type?: string;
  mulch_rules?: string;
  reasoning_summary?: string;
  propagation_window?: string;
  propagation_technique?: string;
  seed_germination_window?: string;
  flowering_period?: string;
  fruiting_period?: string;
  propagation_prior_source?: string;
  research_sources?: string[];
  horticulture_brief?: string;
  judge_rationale?: string;
  llm_warnings?: string[];
}

export type TaskType = 'prune' | 'fertilize' | 'mulch' | 'frost_protect' | 'harvest' | 'inspect';

export interface GardenTask {
  id: string;
  plant_id: string;
  plant_name: string;
  plant_species?: string;
  type: TaskType;
  title: string;
  due_date: string; // YYYY-MM-DD
  why: string;
  how: string;
  done: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface EveningChecklistItem {
  id: string;
  title: string;
  description: string;
}

export interface FrostAlert {
  id: string;
  date: string;
  text: string;
  severity: 'info' | 'warning' | 'danger';
  temp_min_f: number;
  vulnerable_plants: string[];
  action_recommendation: string;
  resolved: boolean;
  created_at: string;
}

export interface Settings {
  address?: string;
  formatted_address?: string;
  zip: string;
  city: string;
  lat?: number;
  lon?: number;
  zone: string;
  temperature_range?: string;
  first_frost: string;
  last_frost: string;
  units: 'F' | 'C';
  ollama_model?: string;
  ollama_endpoint?: string;
  mock_frost_simulation: boolean;
  last_location_label?: string;
  yard_location_labels?: string[];
}

export interface ForecastDay {
  date: string;
  day_name: string;
  temp_max: number;
  temp_min: number;
  apparent_min: number;
  precip_prob: number;
  weather_code: number;
  condition_text: string;
  frost_risk: 'none' | 'tender_watch' | 'freeze_warning' | 'hard_freeze';
}
