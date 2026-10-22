import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Save,
  CheckCircle2,
  Globe,
  Navigation,
} from 'lucide-react';
import { Settings } from '../shared/types';
import { api } from '../shared/api';

interface SetupPageProps {
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
  onAgentCalibrated: (settings: Settings) => Promise<void>;
}

const agentFieldClass =
  'w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50 text-stone-800 cursor-default font-mono';

function AgentReadOnlyField({
  label,
  value,
  hint,
  placeholder = 'Locate address to fill',
  uppercase,
}: {
  label: string;
  value: string;
  hint?: string;
  placeholder?: string;
  uppercase?: boolean;
}) {
  const display = value?.trim() ? value : '';
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-700 mb-1.5">{label}</label>
      <div
        className={`${agentFieldClass}${uppercase ? ' uppercase font-semibold' : ''}`}
        aria-readonly="true"
      >
        {display || (
          <span className="text-stone-400 font-sans not-italic normal-case font-normal">{placeholder}</span>
        )}
      </div>
      {hint ? (
        <span className="block text-[11px] text-stone-400 mt-1">{hint}</span>
      ) : null}
    </div>
  );
}

export const SetupPage: React.FC<SetupPageProps> = ({
  settings,
  onSaveSettings,
  onAgentCalibrated,
}) => {
  const [addressInput, setAddressInput] = useState(settings.address || settings.city || '');
  const [calibrated, setCalibrated] = useState<Settings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    setCalibrated({ ...settings });
  }, [settings]);

  const applyAgentSettings = (res: Settings) => {
    setCalibrated(res);
    const verified = res.formatted_address || res.address || res.city || '';
    if (verified) setAddressInput(verified);
  };

  const handleAddressSearch = async (addressQuery: string) => {
    if (!addressQuery.trim()) return;
    setIsLocating(true);
    setLocateError(null);
    try {
      const res = await api.lookupLocation(addressQuery.trim());
      applyAgentSettings(res);
      await onAgentCalibrated(res);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setLocateError(
        e instanceof Error
          ? e.message
          : 'Could not resolve that address. Add city and state or try your ZIP code.'
      );
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
          setLocateError(null);
          const res = await api.lookupCoords(pos.coords.latitude, pos.coords.longitude);
          applyAgentSettings(res);
          await onAgentCalibrated(res);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        } catch (e) {
          console.error(e);
          setLocateError('GPS lookup failed. Try entering your street address manually.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocateError('Location access denied or unavailable.');
      },
      { timeout: 8000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setIsSaving(true);
    try {
      await onSaveSettings({ address: addressInput.trim() });
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
            Address Setup
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
            Enter your yard address or ZIP; agents resolve the verified location, USDA zone, frost dates, and coordinates live.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold font-display text-stone-900">
                1. Yard Address & Hardiness Calibration
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
              Street Address, City, or ZIP Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace, Springfield, OR or 123 Elm St, Austin TX"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={() => handleAddressSearch(addressInput)}
                disabled={isLocating || !addressInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-xl transition-all shadow-2xs whitespace-nowrap"
              >
                {isLocating ? 'Locating...' : 'Locate Address'}
              </button>
            </div>
            <span className="block text-[11px] text-stone-400">
              Street addresses use OpenStreetMap (Nominatim); cities use Open-Meteo—then USDA zone from your ZIP.
            </span>
            {locateError ? (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-2">
                {locateError}
              </p>
            ) : null}
          </div>

          <p className="text-[11px] text-stone-500 pt-1">
            Fields below are filled by the MCP geocoding agent after you locate an address or use GPS—they are not editable.
          </p>

          <AgentReadOnlyField
            label="Verified yard location (agent)"
            value={calibrated.formatted_address || calibrated.address || calibrated.city}
            hint="Canonical address returned by the geocoding agent"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <AgentReadOnlyField
              label="Postal / ZIP Code"
              value={calibrated.zip}
              hint="Postcode for weather forecasts"
            />
            <AgentReadOnlyField
              label="USDA Hardiness Zone"
              value={calibrated.zone}
              hint={
                calibrated.temperature_range
                  ? `PRISM / USDA (${calibrated.temperature_range}°F)`
                  : 'Official PRISM / USDA Zone'
              }
              uppercase
            />
            <AgentReadOnlyField
              label="Temperature Units"
              value={calibrated.units === 'C' ? 'Celsius (°C)' : calibrated.units === 'F' ? 'Fahrenheit (°F)' : ''}
              hint="Derived with climate calibration"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <AgentReadOnlyField
              label="Average Last Spring Frost (MM-DD)"
              value={calibrated.last_frost}
            />
            <AgentReadOnlyField
              label="Average First Fall Frost (MM-DD)"
              value={calibrated.first_frost}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved
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
