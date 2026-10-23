import {
  PlantCandidate,
  GardenTask,
  Settings,
  ForecastDay,
  FrostAlert,
  EveningChecklistItem,
} from './types';
import { collectInUseLocationLabels } from './yardLocations';
import { httpErrorMessage } from './apiErrors';

type YardLocationsResult = {
  success: boolean;
  settings: Settings;
  plants: PlantCandidate[];
  candidates: PlantCandidate[];
  tasks: GardenTask[];
};

function isUnifiedYardLocationResponse(body: unknown): body is YardLocationsResult {
  const record = body as YardLocationsResult;
  return Boolean(
    record?.settings && Array.isArray(record.plants) && Array.isArray(record.candidates)
  );
}

type YardLocationApiSlice = {
  getPlants: () => Promise<{ plants: PlantCandidate[]; candidates: PlantCandidate[] }>;
  updatePlant: (
    plantId: string,
    updates: Partial<
      Pick<PlantCandidate, 'location_label' | 'location_labels' | 'common_name' | 'species' | 'notes'>
    >
  ) => Promise<{ plant: PlantCandidate; tasks: GardenTask[] }>;
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>;
  getTasks: () => Promise<{ tasks: GardenTask[] }>;
};

async function applyYardLocationsOnLegacyBackend(
  payload: {
    rename?: Record<string, string>;
    plant_id?: string;
    location_labels?: string[];
  },
  apiRef: YardLocationApiSlice
): Promise<YardLocationsResult> {
  const rename = payload.rename ?? {};
  const { plants: initialPlants } = await apiRef.getPlants();
  let latestTasks: GardenTask[] = [];

  for (const plant of initialPlants) {
    const labels = plant.location_labels?.length
      ? plant.location_labels
      : plant.location_label
        ? [plant.location_label]
        : [];
    const nextLabels = labels.map((lab) => {
      const trimmed = lab.trim();
      return rename[trimmed]?.trim() || trimmed;
    });
    if (nextLabels.join('|') !== labels.map((l) => l.trim()).join('|')) {
      const updated = await apiRef.updatePlant(plant.id, {
        location_labels: nextLabels,
        location_label: nextLabels[0],
      });
      latestTasks = updated.tasks;
    }
  }

  if (payload.plant_id && payload.location_labels?.length) {
    const updated = await apiRef.updatePlant(payload.plant_id, {
      location_labels: payload.location_labels,
      location_label: payload.location_labels[0],
    });
    latestTasks = updated.tasks;
  }

  const plantsData = await apiRef.getPlants();
  const inUse = collectInUseLocationLabels(plantsData.plants, plantsData.candidates);
  const settings = await apiRef.updateSettings({
    yard_location_labels: inUse,
    last_location_label: payload.location_labels?.[0] || inUse[0] || '',
  });
  if (!latestTasks.length) {
    const tasksData = await apiRef.getTasks();
    latestTasks = tasksData.tasks;
  }

  return {
    success: true,
    settings,
    plants: plantsData.plants,
    candidates: plantsData.candidates,
    tasks: latestTasks,
  };
}

export const api = {
  async getSettings(): Promise<Settings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings from Python server');
    return res.json();
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || 'Failed to update settings');
    }
    return body as Settings;
  },

  async lookupLocation(query: string): Promise<Settings> {
    const res = await fetch('/api/location/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        (errBody as { error?: string }).error || 'Location lookup failed'
      );
    }
    return res.json();
  },

  async lookupCoords(lat: number, lon: number): Promise<Settings> {
    const res = await fetch('/api/location/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    });
    if (!res.ok) throw new Error('Coordinate lookup failed');
    return res.json();
  },

  async getPlants(): Promise<{ plants: PlantCandidate[]; candidates: PlantCandidate[] }> {
    const res = await fetch('/api/plants');
    if (!res.ok) throw new Error('Failed to load plants from Python server');
    return res.json();
  },

  async confirmPlant(candidateId: string, editedData: Partial<PlantCandidate>): Promise<{ success: boolean; plant: PlantCandidate; tasksCount: number }> {
    const res = await fetch('/api/plants/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, editedData }),
    });
    if (!res.ok) throw new Error('Failed to confirm plant');
    return res.json();
  },

  async skipCandidate(candidateId: string): Promise<void> {
    const res = await fetch(`/api/plants/candidate/${candidateId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete candidate');
  },

  async deletePlant(plantId: string): Promise<void> {
    const res = await fetch(`/api/plants/${plantId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete plant');
  },

  async updateYardLocations(payload: {
    rename?: Record<string, string>;
    plant_id?: string;
    location_labels?: string[];
  }): Promise<YardLocationsResult> {
    if (!payload.plant_id || !payload.location_labels?.length) {
      throw new Error('Select at least one yard location for this plant before saving.');
    }

    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    for (const path of ['/api/plants/update-location', '/api/settings']) {
      const res = await fetch(path, requestInit);
      const body = await res.json().catch(() => ({}));

      if (res.status === 404) {
        continue;
      }

      if (!res.ok) {
        const message = (body as { error?: string }).error || 'Failed to update yard locations';
        if (message.includes('Endpoint not found')) {
          break;
        }
        throw new Error(message);
      }

      if (isUnifiedYardLocationResponse(body)) {
        return {
          success: body.success ?? true,
          settings: body.settings,
          plants: body.plants,
          candidates: body.candidates,
          tasks: body.tasks ?? [],
        };
      }

      if (path === '/api/settings') {
        break;
      }
    }

    return applyYardLocationsOnLegacyBackend(payload, api);
  },

  async updatePlant(
    plantId: string,
    updates: Partial<
      Pick<PlantCandidate, 'location_label' | 'location_labels' | 'common_name' | 'species' | 'notes'>
    >
  ): Promise<{ plant: PlantCandidate; tasks: GardenTask[] }> {
    const headers = { 'Content-Type': 'application/json' };
    let res = await fetch(`/api/plants/${plantId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (res.status === 404) {
      res = await fetch('/api/plants/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plant_id: plantId, ...updates }),
      });
    }

    const errBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = (errBody as { error?: string }).error || 'Failed to update plant';
      if (raw.includes('Endpoint not found')) {
        throw new Error(
          'Python API is out of date. Stop the dev server (Ctrl+C) and run npm run dev again.'
        );
      }
      throw new Error(raw);
    }
    return errBody as { plant: PlantCandidate; tasks: GardenTask[] };
  },

  async refreshPlantCare(
    plantId: string
  ): Promise<{
    success: boolean;
    plant: PlantCandidate;
    tasks: GardenTask[];
    warnings?: string[];
    partial?: boolean;
    calendar_error?: string;
    plant_care_ok?: boolean;
  }> {
    const res = await fetch('/api/plants/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plant_id: plantId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 207) {
      const message = httpErrorMessage(
        res.status,
        body,
        'Failed to refresh plant data. Check Ollama models and retry.'
      );
      console.error('[YardSloth] refreshPlantCare failed:', res.status, body);
      throw new Error(message);
    }
    return body as {
      success: boolean;
      plant: PlantCandidate;
      tasks: GardenTask[];
      warnings?: string[];
      partial?: boolean;
      calendar_error?: string;
      plant_care_ok?: boolean;
    };
  },

  async refreshAllPlantsCare(): Promise<{
    success: boolean;
    plants: PlantCandidate[];
    tasks: GardenTask[];
    refreshed_count: number;
    errors: { plant_id?: string; common_name?: string; error: string }[];
    calendar_error?: string;
  }> {
    const res = await fetch('/api/plants/refresh-all', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 207) {
      throw new Error(
        httpErrorMessage(res.status, body, 'Failed to refresh all plant data. Check Ollama models and retry.')
      );
    }
    return body as {
      success: boolean;
      plants: PlantCandidate[];
      tasks: GardenTask[];
      refreshed_count: number;
      errors: { plant_id?: string; common_name?: string; error: string }[];
      calendar_error?: string;
    };
  },

  async identifyPlant(data: {
    location_label: string;
    plant_name?: string;
    image_base64?: string;
    sample_species?: string;
  }): Promise<{ candidate: PlantCandidate; settings?: Settings }> {
    const res = await fetch('/api/census/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        (errBody as { error?: string }).error || 'Plant Census Agent execution failed'
      );
    }
    return res.json();
  },

  async getTasks(): Promise<{ tasks: GardenTask[] }> {
    const res = await fetch('/api/calendar/tasks');
    if (!res.ok) throw new Error('Failed to load tasks');
    return res.json();
  },

  async generateTasks(): Promise<{ success: boolean; tasks: GardenTask[] }> {
    const res = await fetch('/api/calendar/generate', { method: 'POST' });
    if (!res.ok) throw new Error('Care Calendar Agent generation failed');
    return res.json();
  },

  async toggleTask(taskId: string): Promise<GardenTask> {
    const res = await fetch(`/api/calendar/tasks/${taskId}/toggle`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to toggle task');
    const data = await res.json();
    return data.task;
  },

  getIcsExportUrl(): string {
    return '/api/calendar/export-ics';
  },

  async getForecast(): Promise<{
    location: string;
    zip: string;
    forecast: ForecastDay[];
    alert: FrostAlert;
    simulationActive: boolean;
  }> {
    const res = await fetch('/api/forecast');
    if (!res.ok) throw new Error('Frost Watch Agent forecast failed');
    return res.json();
  },

  async toggleFrostSimulation(): Promise<{
    mock_frost_simulation: boolean;
    forecast?: import('./types').ForecastDay[];
    alert?: import('./types').FrostAlert;
    simulationActive?: boolean;
  }> {
    const res = await fetch('/api/forecast/toggle-simulation', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle frost simulation');
    return res.json();
  },

  async getEveningChecklist(): Promise<EveningChecklistResponse> {
    const res = await fetch('/api/tonight/evening-checklist');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || 'Could not load tonight suggestions');
    }
    return body as EveningChecklistResponse;
  },

  async generateEveningChecklist(): Promise<EveningChecklistResponse> {
    const res = await fetch('/api/tonight/evening-checklist', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || 'Evening checklist agent failed');
    }
    return body as EveningChecklistResponse;
  },

  async saveEveningChecklistChecked(checked: Record<string, boolean>): Promise<void> {
    const res = await fetch('/api/tonight/evening-checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || 'Could not save checklist progress');
    }
  },
};

export type EveningChecklistResponse = {
  items: EveningChecklistItem[];
  source?: string | null;
  tonight_low_f?: number | null;
  message?: string | null;
  generated_at?: string | null;
  calendar_day?: string | null;
  checked?: Record<string, boolean>;
  from_cache?: boolean;
};
