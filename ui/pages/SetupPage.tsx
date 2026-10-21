import React, { useState } from 'react';
import {
  MapPin,
  Save,
  CheckCircle2,
  Cpu,
  Globe,
  Navigation,
} from 'lucide-react';
import { Settings } from '../shared/types';
import { api } from '../shared/api';

interface SetupPageProps {
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const SetupPage: React.FC<SetupPageProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<Settings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddressSearch = async (addressQuery: string) => {
    if (!addressQuery.trim()) return;
    setIsLocating(true);
    try {
      const res = await api.lookupLocation(addressQuery.trim());
      setFormData(res);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleGPSDetect = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.lookupCoords(pos.coords.latitude, pos.coords.longitude);
          setFormData(res);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { timeout: 8000 }
    );
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

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs">
        <img
          src="/ui/assets/images/yard_sloth_mascot_1792452704231.jpg"
          alt="Yard Sloth mascot"
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-2xs border border-stone-200"
        />
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Climate & Python Agent Settings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
            Changing your ZIP code dispatches the MCP tool to query online USDA climate zones and frost records live. Zero static data files are stored.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold font-display text-stone-900">
                1. Yard Address & Hardiness Calibration (MCP Live Geocoding)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleGPSDetect}
              disabled={isLocating}
              className="text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-700" />
              {isLocating ? 'Detecting GPS...' : 'Use My GPS Location'}
            </button>
          </div>

          {/* Full Street Address / City Search Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Street Address, City, or Yard Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.address || formData.city || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 742 Evergreen Terrace, Springfield, OR or 123 Elm St, Austin TX"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={() => handleAddressSearch(formData.address || formData.city || '')}
                disabled={isLocating || !(formData.address || formData.city)}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-xl transition-all shadow-2xs whitespace-nowrap"
              >
                {isLocating ? 'Locating...' : 'Locate Address'}
              </button>
            </div>
            <span className="block text-[11px] text-stone-400">
              Dispatches MCP web tool to resolve exact latitude, longitude, and USDA zone on the fly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Postal / ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="e.g. 97201"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                Postcode for weather forecasts
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                USDA Hardiness Zone
              </label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="e.g. 8b"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono uppercase font-semibold"
              />
              <span className="block text-[11px] text-stone-400 mt-1">
                {formData.temperature_range ? `PRISM / USDA (${formData.temperature_range}°F)` : 'Official PRISM / USDA Zone'}
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
                Calculated on the fly
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
                Calculated on the fly
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: MCP Tooling & Architecture Guarantee */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Globe className="w-4 h-4 text-emerald-800" />
            <h2 className="text-base font-bold font-display text-stone-900">
              2. MCP Web Browsing Tool & Architecture Status
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700 space-y-2">
            <div>
              <span className="font-bold text-stone-900">Zero-Storage Architecture: </span>
              The static files <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">care_rules.json</code> and <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">frost_dates.json</code> have been completely purged from the repository.
            </div>
            <div>
              <span className="font-bold text-stone-900">Live Web Browsing: </span>
              All botanical pruning knowledge and meteorological data are retrieved by agents using the Model Context Protocol tool (<code className="bg-stone-200 px-1 py-0.5 rounded font-mono">web_browser_tool.py</code>).
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved and Python calendar recalibrated!
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
