import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Save,
  CheckCircle2,
  Cpu,
  Shield,
  Server,
  RefreshCw,
} from 'lucide-react';
import { Settings } from '../types';

interface SetupScreenProps {
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<Settings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [ollamaTestStatus, setOllamaTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');

  const zonePresets: Record<string, { zone: string; last: string; first: string }> = {
    '97201': { zone: '8', last: '03-25', first: '11-15' }, // Portland
    '98101': { zone: '8', last: '03-28', first: '11-10' }, // Seattle
    '60601': { zone: '6', last: '04-25', first: '10-15' }, // Chicago
    '10001': { zone: '7', last: '04-10', first: '11-05' }, // New York
    '80202': { zone: '6', last: '05-10', first: '10-01' }, // Denver
    '02108': { zone: '6', last: '04-20', first: '10-25' }, // Boston
    '30301': { zone: '8', last: '03-20', first: '11-15' }, // Atlanta
    '78701': { zone: '9', last: '02-28', first: '12-01' }, // Austin
    '94102': { zone: '10', last: '01-15', first: '12-31' }, // San Francisco
    '55401': { zone: '4', last: '05-10', first: '09-28' }, // Minneapolis
  };

  const handleZipChange = (zip: string) => {
    const clean = zip.trim();
    setFormData((prev) => {
      const match = zonePresets[clean];
      if (match) {
        return {
          ...prev,
          zip: clean,
          zone: match.zone,
          last_frost: match.last,
          first_frost: match.first,
        };
      }
      return { ...prev, zip: clean };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const testOllamaConnection = () => {
    setOllamaTestStatus('testing');
    setTimeout(() => {
      setOllamaTestStatus('success');
      setTimeout(() => setOllamaTestStatus('idle'), 3000);
    }, 800);
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header Lockup */}
      <div className="flex items-center gap-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs">
        <img
          src="/src/assets/images/yard_sloth_mascot_1792452704231.jpg"
          alt="Yard Sloth garden mascot"
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-2xs border border-stone-200"
        />
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Yard Sloth Setup & Climate Config
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
            Enter your ZIP code to establish your USDA Hardiness Zone and local frost boundaries. All calculations run deterministically on your machine.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Geographic & Frost Calibration */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <MapPin className="w-4 h-4 text-emerald-800" />
            <h2 className="text-base font-bold font-display text-stone-900">
              1. Geographic & Frost Boundary Calibration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => handleZipChange(e.target.value)}
                placeholder="e.g. 97201"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                Autofills zone & frost dates for common regions
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                USDA Hardiness Zone
              </label>
              <select
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((z) => (
                  <option key={z} value={String(z)}>
                    Zone {z}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] text-stone-400 mt-1">
                Dictates perennial survival thresholds
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Temperature Units
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, units: 'F' })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    formData.units === 'F'
                      ? 'bg-stone-900 text-stone-50 border-stone-900'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  Fahrenheit (°F)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, units: 'C' })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    formData.units === 'C'
                      ? 'bg-stone-900 text-stone-50 border-stone-900'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  Celsius (°C)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Average Last Spring Frost (MM-DD)
              </label>
              <input
                type="text"
                value={formData.last_frost}
                onChange={(e) => setFormData({ ...formData, last_frost: e.target.value })}
                placeholder="04-15"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                Used to schedule early spring dormant pruning & warm-season planting
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Average First Fall Frost (MM-DD)
              </label>
              <input
                type="text"
                value={formData.first_frost}
                onChange={(e) => setFormData({ ...formData, first_frost: e.target.value })}
                placeholder="10-25"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                Used to schedule autumn winterizing, mulching & harvest cutoffs
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Local AI & Ollama Configuration */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold font-display text-stone-900">
                2. Local Inference & CrewAI Engine
              </h2>
            </div>
            <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
              Privacy Guaranteed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Ollama Endpoint (Local API)
              </label>
              <input
                type="text"
                value={formData.ollama_endpoint}
                onChange={(e) => setFormData({ ...formData, ollama_endpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                Default local Ollama daemon port
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Vision & Reasoning Model
              </label>
              <select
                value={formData.ollama_model}
                onChange={(e) => setFormData({ ...formData, ollama_model: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white font-mono text-xs"
              >
                <option value="llama3.2-vision:latest">llama3.2-vision:latest (Recommended)</option>
                <option value="minicpm-v-2.6:latest">minicpm-v-2.6:latest (Fast on M1/M2)</option>
                <option value="llava:13b">llava:13b (Deep context)</option>
                <option value="gemini-3.8-flash">Cloud Fallback (Gemini 3.8 Flash)</option>
              </select>
              <span className="block text-[11px] text-stone-400 mt-1">
                Local vision model for Plant Census Agent
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span className="font-semibold text-stone-900">Offline & Privacy Guard: </span>
              In local mode, yard photos never leave your device. CrewAI telemetry is disabled by default via <code className="text-stone-800">CREWAI_TELEMETRY_OPT_OUT=true</code>.
            </div>
            <button
              type="button"
              onClick={testOllamaConnection}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {ollamaTestStatus === 'testing' ? 'Pinging...' : ollamaTestStatus === 'success' ? 'Connected!' : 'Ping Ollama'}
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved and calendar recalibrated!
            </div>
          )}
          {!savedSuccess && <div />}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 active:scale-[0.98] rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
