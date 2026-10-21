import React, { useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Settings } from '../shared/types';
import { api } from '../shared/api';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: Settings;
  onLocationUpdated: (updated: Settings) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onLocationUpdated,
}) => {
  const [query, setQuery] = useState(currentSettings.address || currentSettings.city || '');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<Settings | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setIsSearching(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const updated = await api.lookupLocation(q);
      setSuccessInfo(updated);
      onLocationUpdated(updated);
      setTimeout(() => {
        onClose();
        setSuccessInfo(null);
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not locate address. Try a city, state, or ZIP code.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await api.lookupCoords(pos.coords.latitude, pos.coords.longitude);
          setSuccessInfo(updated);
          onLocationUpdated(updated);
          setTimeout(() => {
            onClose();
            setSuccessInfo(null);
          }, 1400);
        } catch (err: any) {
          setErrorMsg('Failed to resolve coordinates. Try entering your ZIP code.');
        } finally {
          setIsSearching(false);
        }
      },
      (err) => {
        setIsSearching(false);
        setErrorMsg('Location access denied or unavailable. Enter your ZIP code manually.');
      },
      { timeout: 8000 }
    );
  };

  const samplePresets = [
    { label: 'Austin, TX', query: 'Austin, TX' },
    { label: 'Denver, CO', query: 'Denver, CO' },
    { label: 'Chicago, IL', query: 'Chicago, IL' },
    { label: 'Seattle, WA', query: 'Seattle, WA' },
    { label: 'New York, NY', query: 'New York, NY' },
    { label: 'Boston, MA', query: 'Boston, MA' },
    { label: 'Atlanta, GA', query: 'Atlanta, GA' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-stone-900">
                Set Yard Location & Address
              </h3>
              <p className="text-xs text-stone-500">
                Resolves official PRISM / USDA Hardiness Zone and live Open-Meteo weather.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Street Address, City, or ZIP Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace, Austin TX, or 97201"
                className="w-full pl-3 pr-24 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Locate
              </button>
            </div>
          </div>

          {/* GPS Auto-Locate Button */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isSearching}
            className="w-full py-2.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-700" />
            Use My Current Device GPS Location
          </button>

          {/* Quick City Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setQuery(p.query);
                    handleSearch(p.query);
                  }}
                  className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200/70 text-stone-700 rounded-lg transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold">Location confirmed: </span>
                {successInfo.city} (USDA Zone {successInfo.zone}{successInfo.temperature_range ? ` [${successInfo.temperature_range}°F]` : ''}, Spring frost: {successInfo.last_frost}, Fall frost: {successInfo.first_frost})
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
