export type BloomWoodType = 'old_wood' | 'new_wood' | 'both' | 'not_applicable';
export type FrostSensitivity = 'tender' | 'semi_hardy' | 'hardy';
export type CareCategory = 'shrub' | 'perennial' | 'annual' | 'fruit_tree' | 'vegetable' | 'herb' | 'houseplant';

export interface PlantCandidate {
  id: string;
  photo_url: string;
  location_label: string;
  common_name: string;
  species: string;
  genus: string;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  bloom_wood: BloomWoodType;
  frost_sensitivity: FrostSensitivity;
  frost_threshold_f: number;
  care_category: CareCategory;
  confirmed: boolean;
  notes?: string;
  created_at: string;
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
  zip: string;
  city: string;
  zone: string;
  first_frost: string; // MM-DD
  last_frost: string; // MM-DD
  units: 'F' | 'C';
  ollama_model: string;
  ollama_endpoint: string;
  mock_frost_simulation: boolean;
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

export interface AgentLogStep {
  id: string;
  timestamp: string;
  agent: 'Plant Census' | 'Care Calendar' | 'Frost Watch';
  message: string;
  tool_called?: string;
  status: 'running' | 'success' | 'warn';
}
