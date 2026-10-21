import { PlantCandidate, GardenTask, Settings, ForecastDay, FrostAlert } from './types';

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
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async lookupLocation(query: string): Promise<Settings> {
    const res = await fetch('/api/location/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('Location lookup failed');
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

  async identifyPlant(data: { location_label: string; image_base64?: string; sample_species?: string }): Promise<{ candidate: PlantCandidate }> {
    const res = await fetch('/api/census/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Plant Census Agent execution failed');
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

  async toggleFrostSimulation(): Promise<{ mock_frost_simulation: boolean }> {
    const res = await fetch('/api/forecast/toggle-simulation', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle frost simulation');
    return res.json();
  },
};
