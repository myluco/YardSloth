import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  ThermometerSnowflake,
  Camera,
  Leaf,
  Calendar as CalendarIcon,
  SlidersHorizontal,
} from 'lucide-react';

import {
  PlantCandidate,
  GardenTask,
  Settings,
  ForecastDay,
  FrostAlert,
} from './shared/types';
import { api } from './shared/api';
import { Header } from './components/Header';
import { FrostBanner } from './components/FrostBanner';
import { TonightPage } from './pages/TonightPage';
import { YardWalkPage } from './pages/YardWalkPage';
import { ConfirmPlantsPage } from './pages/ConfirmPlantsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SetupPage } from './pages/SetupPage';
import { OpenSourceStoryModal } from './components/OpenSourceStoryModal';
import { LocationModal } from './components/LocationModal';
import { ActionToast } from './components/ActionToast';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('tonight');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    address: 'Portland, OR',
    zip: '97201',
    city: 'Portland, Oregon',
    zone: '8b',
    temperature_range: '15 to 20',
    first_frost: '11-15',
    last_frost: '03-15',
    units: 'F',
    mock_frost_simulation: false,
  });

  const [plants, setPlants] = useState<PlantCandidate[]>([]);
  const [candidates, setCandidates] = useState<PlantCandidate[]>([]);
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alert, setAlert] = useState<FrostAlert | null>(null);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  const loadInitialData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [settingsData, plantsData, tasksData, forecastData] = await Promise.all([
        api.getSettings(),
        api.getPlants(),
        api.getTasks(),
        api.getForecast(),
      ]);

      setSettings(settingsData);
      setPlants(plantsData.plants);
      setCandidates(plantsData.candidates);
      setTasks(tasksData.tasks);
      setForecast(forecastData.forecast);
      setAlert(forecastData.alert);
      setSimulationActive(forecastData.simulationActive);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setErrorMsg(err.message || 'Error connecting to Python backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleToggleSimulation = async () => {
    try {
      const result = await api.toggleFrostSimulation();
      setSimulationActive(result.mock_frost_simulation);
      if (result.forecast) setForecast(result.forecast);
      if (result.alert) setAlert(result.alert);
      if (!result.forecast || !result.alert) {
        const forecastData = await api.getForecast();
        setForecast(forecastData.forecast);
        setAlert(forecastData.alert);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefreshForecast = async () => {
    try {
      const forecastData = await api.getForecast();
      setForecast(forecastData.forecast);
      setAlert(forecastData.alert);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCandidateAdded = async (
    newCandidate: PlantCandidate,
    updatedSettings?: Settings
  ) => {
    if (updatedSettings) {
      setSettings(updatedSettings);
    }
    try {
      const plantsData = await api.getPlants();
      setPlants(plantsData.plants);
      setCandidates(plantsData.candidates);
    } catch {
      setCandidates((prev) => [
        newCandidate,
        ...prev.filter((c) => c.id !== newCandidate.id),
      ]);
    }
    setCurrentTab('confirm');
  };

  const handleUpdatePlant = async (
    plantId: string,
    updates: Partial<
      Pick<PlantCandidate, 'location_label' | 'location_labels' | 'common_name' | 'species' | 'notes'>
    >
  ) => {
    const res = await api.updatePlant(plantId, updates);
    setPlants((prev) => prev.map((p) => (p.id === plantId ? res.plant : p)));
    setTasks(res.tasks);
    if (updates.location_label || updates.location_labels) {
      const settingsData = await api.getSettings();
      setSettings(settingsData);
    }
  };

  const handleYardLocationsSave = async (payload: {
    rename?: Record<string, string>;
    plant_id?: string;
    location_labels?: string[];
  }) => {
    const res = await api.updateYardLocations(payload);
    if (res.settings) setSettings(res.settings);
    setPlants((prev) => res.plants ?? prev);
    setCandidates((prev) => res.candidates ?? prev);
    setTasks((prev) => res.tasks ?? prev);
  };

  const handleConfirmPlant = async (candidateId: string, editedData: Partial<PlantCandidate>) => {
    try {
      const res = await api.confirmPlant(candidateId, editedData);
      if (res.success) {
        setPlants((prev) => [...prev, res.plant]);
        setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        const [updatedTasks, forecastData] = await Promise.all([
          api.getTasks(),
          api.getForecast(),
        ]);
        setTasks(updatedTasks.tasks);
        setAlert(forecastData.alert);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipCandidate = async (candidateId: string) => {
    try {
      await api.skipCandidate(candidateId);
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      await api.deletePlant(plantId);
      setPlants((prev) => prev.filter((p) => p.id !== plantId));
      setTasks((prev) => prev.filter((t) => t.plant_id !== plantId));
      const forecastData = await api.getForecast();
      setAlert(forecastData.alert);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const updated = await api.toggleTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const reportActionError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback;
    flushSync(() => {
      setActionError(message);
      setCurrentTab('confirm');
    });
    return message;
  };

  const handleRegenerateCalendar = async () => {
    setActionError(null);
    try {
      const res = await api.generateTasks();
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
      reportActionError(err, 'Could not regenerate the care calendar.');
      throw err;
    }
  };

  const handleRefreshPlantCare = async (plantId: string) => {
    setActionError(null);
    try {
      const res = await api.refreshPlantCare(plantId);
      setPlants((prev) => prev.map((p) => (p.id === plantId ? res.plant : p)));
      setTasks(res.tasks);
      const forecastData = await api.getForecast();
      setForecast(forecastData.forecast);
      setAlert(forecastData.alert);
      if (res.calendar_error) {
        const msg = `Plant care updated, but the calendar could not be regenerated: ${res.calendar_error}`;
        setActionError(msg);
        setCurrentTab('confirm');
        throw new Error(msg);
      }
      if (res.warnings?.length) {
        const msg = res.warnings.join(' ');
        setActionError(msg);
        setCurrentTab('confirm');
        throw new Error(msg);
      }
    } catch (err) {
      reportActionError(err, 'Could not refresh plant data.');
      throw err;
    }
  };

  const handleRefreshAllPlantsCare = async () => {
    setActionError(null);
    try {
      const res = await api.refreshAllPlantsCare();
      setPlants(res.plants);
      setTasks(res.tasks);
      const forecastData = await api.getForecast();
      setForecast(forecastData.forecast);
      setAlert(forecastData.alert);
      if (res.errors?.length) {
        const names = res.errors.map((e) => e.common_name || e.plant_id).join(', ');
        const msg = `Updated ${res.refreshed_count} plant(s). Failed for: ${names}. ${res.errors[0]?.error || ''}`;
        setActionError(msg);
        setCurrentTab('confirm');
        throw new Error(msg);
      }
      if (res.calendar_error) {
        setActionError(res.calendar_error);
        setCurrentTab('confirm');
        throw new Error(res.calendar_error);
      }
    } catch (err) {
      reportActionError(err, 'Could not refresh all plant data.');
      throw err;
    }
  };

  const refreshAfterSettingsChange = async () => {
    const [updatedTasks, forecastData] = await Promise.all([
      api.getTasks(),
      api.getForecast(),
    ]);
    setTasks(updatedTasks.tasks);
    setForecast(forecastData.forecast);
    setAlert(forecastData.alert);
  };

  const handleSaveSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
      await refreshAfterSettingsChange();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAgentCalibrated = async (updated: Settings) => {
    setSettings(updated);
    await refreshAfterSettingsChange();
  };

  const handleUpdateLocation = async (query: string) => {
    try {
      const updated = await api.lookupLocation(query);
      setSettings(updated);
      const [updatedTasks, forecastData] = await Promise.all([
        api.getTasks(),
        api.getForecast(),
      ]);
      setTasks(updatedTasks.tasks);
      setForecast(forecastData.forecast);
      setAlert(forecastData.alert);
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  const handleUseGPS = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await api.lookupCoords(pos.coords.latitude, pos.coords.longitude);
          setSettings(updated);
          const [updatedTasks, forecastData] = await Promise.all([
            api.getTasks(),
            api.getForecast(),
          ]);
          setTasks(updatedTasks.tasks);
          setForecast(forecastData.forecast);
          setAlert(forecastData.alert);
        } catch (err) {
          console.error('GPS lookup failed:', err);
        }
      },
      (err) => console.error(err),
      { timeout: 8000 }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] flex flex-col items-center justify-center p-6 text-stone-800">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center text-3xl shadow-sm mb-4 animate-bounce">
          🦥
        </div>
        <h2 className="text-xl font-bold font-display text-stone-900">
          Waking Yard Sloth...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        candidateCount={candidates?.length ?? 0}
        alert={alert}
        settings={settings}
        onOpenStory={() => setIsStoryModalOpen(true)}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
      />

      <FrostBanner
        alert={alert}
        simulationActive={simulationActive}
        onToggleSimulation={handleToggleSimulation}
        onViewTonight={() => setCurrentTab('tonight')}
      />

      <ActionToast message={actionError} onDismiss={() => setActionError(null)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:pb-12">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={loadInitialData}
              className="font-semibold underline ml-2 hover:text-red-950"
            >
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm flex items-start justify-between gap-3 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-red-950">Something went wrong</p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                {actionError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="shrink-0 text-xs font-semibold text-red-800 underline hover:text-red-950"
            >
              Dismiss
            </button>
          </div>
        )}

        {currentTab === 'tonight' && (
          <TonightPage
            forecast={forecast}
            alert={alert}
            plants={plants}
            settings={settings}
            simulationActive={simulationActive}
            onToggleSimulation={handleToggleSimulation}
            onUpdateLocation={handleUpdateLocation}
            onUseGPS={handleUseGPS}
            onRefresh={handleRefreshForecast}
          />
        )}

        {currentTab === 'walk' && (
          <YardWalkPage
            settings={settings}
            plants={plants}
            onCandidateAdded={handleCandidateAdded}
            onGoToConfirm={() => setCurrentTab('confirm')}
          />
        )}

        {currentTab === 'confirm' && (
          <ConfirmPlantsPage
            settings={settings}
            candidates={candidates}
            plants={plants}
            onConfirm={handleConfirmPlant}
            onSkip={handleSkipCandidate}
            onDeletePlant={handleDeletePlant}
            onUpdatePlant={handleUpdatePlant}
            onYardLocationsSave={handleYardLocationsSave}
            onWalkYard={() => setCurrentTab('walk')}
            onRefreshPlantCare={handleRefreshPlantCare}
            onRefreshAllPlantsCare={handleRefreshAllPlantsCare}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarPage
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onRegenerate={handleRegenerateCalendar}
            zone={settings.zone}
          />
        )}

        {currentTab === 'setup' && (
          <SetupPage
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onAgentCalibrated={handleAgentCalibrated}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 grid grid-cols-5 items-center h-16 px-1 shadow-lg">
        <button
          onClick={() => setCurrentTab('tonight')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
            currentTab === 'tonight' ? 'text-emerald-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <ThermometerSnowflake className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Tonight</span>
          {alert && (alert.severity === 'warning' || alert.severity === 'danger') && (
            <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setCurrentTab('walk')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'walk' ? 'text-emerald-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Walk</span>
        </button>

        <button
          onClick={() => setCurrentTab('confirm')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
            currentTab === 'confirm' ? 'text-emerald-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <Leaf className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Plants</span>
          {candidates.length > 0 && (
            <span className="absolute top-1.5 right-4 font-mono text-[9px] font-bold px-1 rounded-full bg-amber-500 text-white">
              {candidates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('calendar')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'calendar' ? 'text-emerald-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Calendar</span>
        </button>

        <button
          onClick={() => setCurrentTab('setup')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'setup' ? 'text-emerald-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Setup</span>
        </button>
      </div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentSettings={settings}
        onLocationUpdated={(s) => {
          setSettings(s);
          handleRefreshForecast();
        }}
      />

      <OpenSourceStoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
      />

      <footer className="border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800 font-display">Yard Sloth</span>
            <span>·</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-stone-400">
            <span>·</span>
            <span>Weather by Open-Meteo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
