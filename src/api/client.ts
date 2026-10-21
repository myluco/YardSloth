import { PlantCandidate, GardenTask, Settings, ForecastDay, FrostAlert } from '../types';

export const apiClient = {
  async getSettings(): Promise<Settings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  async getPlants(): Promise<{ plants: PlantCandidate[]; candidates: PlantCandidate[] }> {
    const res = await fetch('/api/plants');
    if (!res.ok) throw new Error('Failed to load plants');
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
    if (!res.ok) throw new Error('Failed to remove candidate');
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Plant identification failed');
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
    if (!res.ok) throw new Error('Failed to generate calendar tasks');
    return res.json();
  },

  async toggleTask(taskId: string): Promise<GardenTask> {
    const res = await fetch(`/api/calendar/tasks/${taskId}/toggle`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to toggle task');
    const data = await res.json();
    return data.task;
  },

  async deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`/api/calendar/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
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
    if (!res.ok) throw new Error('Failed to load forecast');
    return res.json();
  },

  async toggleFrostSimulation(): Promise<{ mock_frost_simulation: boolean }> {
    const res = await fetch('/api/forecast/toggle-simulation', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle frost simulation');
    return res.json();
  },

  async getCrewAiManifest(): Promise<any> {
    const res = await fetch('/api/crewai-manifest');
    if (!res.ok) throw new Error('Failed to get manifest');
    return res.json();
  },
};
