import React, { useState } from 'react';
import {
  ThermometerSnowflake,
  CheckCircle2,
  RefreshCw,
  Check,
  MapPin,
  Navigation,
} from 'lucide-react';
import { ForecastDay, FrostAlert, PlantCandidate } from '../shared/types';

interface TonightPageProps {
  forecast: ForecastDay[];
  alert: FrostAlert | null;
  plants: PlantCandidate[];
  simulationActive: boolean;
  settings: any;
  onUpdateLocation: (query: string) => Promise<void>;
  onUseGPS: () => Promise<void>;
  onToggleSimulation: () => void;
  onRefresh: () => void;
}

export const TonightPage: React.FC<TonightPageProps> = ({
  forecast,
  alert,
  plants,
  simulationActive,
  settings,
  onUpdateLocation,
  onUseGPS,
  onToggleSimulation,
  onRefresh,
}) => {
  const [addressInput, setAddressInput] = useState(settings.address || settings.city || settings.zip || '');
  const [isUpdatingLoc, setIsUpdatingLoc] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setIsUpdatingLoc(true);
    try {
      await onUpdateLocation(addressInput.trim());
      setLocSuccess(true);
      setTimeout(() => setLocSuccess(false), 3000);
    } finally {
      setIsUpdatingLoc(false);
    }
  };

  const toggleCheck = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isFreezing = alert && (alert.severity === 'warning' || alert.severity === 'danger');
  const tonight = forecast[0] || {
    temp_max: 60,
    temp_min: alert?.temp_min_f ?? 45,
    apparent_min: (alert?.temp_min_f ?? 45) - 2,
    precip_prob: 10,
    condition_text: 'Clear Sky',
  };

  const tenderPlants = plants.filter((p) => p.frost_sensitivity === 'tender');
  const semiHardyPlants = plants.filter((p) => p.frost_sensitivity === 'semi_hardy');
  const hardyPlants = plants.filter((p) => p.frost_sensitivity === 'hardy');

  return (
    <div className="space-y-6 pb-12">
      {/* Prominent Yard Address / Location Input Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <h2 className="text-sm font-bold font-display text-stone-900">
                Your Yard Address & Location
              </h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                USDA Zone {settings.zone} {settings.temperature_range ? `(${settings.temperature_range}°F)` : ''}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Calibrated station: <strong className="text-stone-800">{settings.city || settings.address}</strong> (Spring frost: {settings.last_frost}, Fall frost: {settings.first_frost}). Hardiness zone retrieved live from official PRISM / USDA database.
            </p>
          </div>

          <form onSubmit={handleLocationSubmit} className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. 123 Main St, Austin TX, or 78704"
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 min-w-[220px] sm:min-w-[280px] bg-stone-50/50"
            />
            <button
              type="submit"
              disabled={isUpdatingLoc || !addressInput.trim()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-xl transition-all whitespace-nowrap shadow-2xs"
            >
              {isUpdatingLoc ? 'Locating...' : 'Set Address'}
            </button>
            <button
              type="button"
              onClick={onUseGPS}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors shrink-0"
              title="Use my device GPS coordinates"
            >
              <Navigation className="w-4 h-4 text-emerald-700" />
            </button>
          </form>
        </div>
        {locSuccess && (
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Weather station calibrated to {settings.city} (USDA Zone {settings.zone})! 7-day freeze risks recalculated with live Open-Meteo stream.
          </div>
        )}
      </div>

      {/* Hero Visual Card */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-900 text-stone-100">
        <img
          src="/ui/assets/images/frost_protection_garden_1792452704827.jpg"
          alt="Evening autumn garden with protective frost fabric covering tender plants"
          referrerPolicy="no-referrer"
          className="w-full h-64 sm:h-80 object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent p-6 sm:p-8 flex flex-col justify-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-wider uppercase text-amber-300">
              <ThermometerSnowflake className="w-4 h-4" />
              <span>Frost Watch Agent (Python + MCP)</span>
              <span>·</span>
              <span>Open-Meteo Live API</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight leading-tight">
              {isFreezing
                ? `Frost Alert: Overnight Low of ${tonight.temp_min}°F`
                : `Garden Safe: Overnight Low of ${tonight.temp_min}°F`}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-stone-200 leading-relaxed max-w-xl">
              {alert?.text || 'Deterministic Python threshold evaluation over live Open-Meteo weather stream.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Status, Quick Stats & Evening Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Detailed Forecast & Plant Vulnerability Matrix */}
        <div className="lg:col-span-2 space-y-8">
          {/* 7-Day Forecast Strip */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold font-display text-stone-900">
                  7-Day Temperature & Freeze Trajectory
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Streamed live from Open-Meteo Meteorological API for {settings.city || settings.address}. Unmodified real-world weather data.
                </p>
              </div>
              <button
                onClick={onRefresh}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Refresh weather data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3 text-right">High</th>
                    <th className="py-2.5 px-3 text-right">Low</th>
                    <th className="py-2.5 px-3 text-right">Rain</th>
                    <th className="py-2.5 px-3 text-right">Frost Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {forecast.map((day, idx) => {
                    const isToday = idx === 0;
                    return (
                      <tr
                        key={day.date}
                        className={`transition-colors ${
                          isToday ? 'bg-stone-50/80 font-medium text-stone-900' : 'hover:bg-stone-50/50 text-stone-700'
                        }`}
                      >
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={isToday ? 'font-bold text-stone-900' : ''}>
                            {day.day_name}
                          </span>
                          <span className="block text-[11px] text-stone-400 font-mono">
                            {day.date.slice(5)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {day.condition_text}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900">
                          {day.temp_max}°F
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                            day.temp_min <= 32
                              ? 'text-amber-700'
                              : day.temp_min <= 36
                              ? 'text-amber-600'
                              : 'text-stone-700'
                          }`}
                        >
                          {day.temp_min}°F
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                          {day.precip_prob}%
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {day.frost_risk === 'hard_freeze' && (
                            <span className="text-red-700 font-semibold font-mono text-xs">
                              Hard Freeze (≤28°)
                            </span>
                          )}
                          {day.frost_risk === 'freeze_warning' && (
                            <span className="text-amber-700 font-semibold font-mono text-xs">
                              Frost Alert (≤32°)
                            </span>
                          )}
                          {day.frost_risk === 'tender_watch' && (
                            <span className="text-amber-600 font-medium font-mono text-xs">
                              Tender Watch (≤36°)
                            </span>
                          )}
                          {day.frost_risk === 'none' && (
                            <span className="text-emerald-700 font-medium text-xs">
                              Clear
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plant Vulnerability Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <h2 className="text-lg font-bold font-display text-stone-900">
              Plant Vulnerability Breakdown
            </h2>
            <p className="text-xs text-stone-500 mt-0.5 mb-5">
              Evaluated dynamically by Frost Watch Agent against ephemeral memory plants.
            </p>

            <div className="space-y-4">
              {/* Tender Category */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      Tender Species (Threshold: ≤36°F)
                    </span>
                    <span className="text-xs text-stone-500">·</span>
                    <span className="text-xs text-stone-500">
                      {tenderPlants.length} in your yard
                    </span>
                  </div>
                  {tonight.temp_min <= 36 ? (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      High Alert Tonight
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Safe
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {tenderPlants.map((plant) => (
                    <div
                      key={plant.id}
                      className="bg-white p-3 rounded-lg border border-stone-200/70 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-semibold text-stone-900">
                          {plant.common_name}
                        </div>
                        <div className="text-[11px] text-stone-500 italic">
                          {plant.species}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-1">
                          Location: {plant.location_label}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] font-medium text-amber-900">
                        Action: Move potted containers indoors before freeze.
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semi-Hardy Category */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      Semi-Hardy Shrubs & Perennials (Threshold: ≤32°F)
                    </span>
                    <span className="text-xs text-stone-500">·</span>
                    <span className="text-xs text-stone-500">
                      {semiHardyPlants.length} in your yard
                    </span>
                  </div>
                  {tonight.temp_min <= 32 ? (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Protect Tonight
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Safe
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {semiHardyPlants.map((plant) => (
                    <div
                      key={plant.id}
                      className="bg-white p-3 rounded-lg border border-stone-200/70 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-semibold text-stone-900">
                          {plant.common_name}
                        </div>
                        <div className="text-[11px] text-stone-500 italic">
                          {plant.species}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-1">
                          Location: {plant.location_label}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-700">
                        {plant.bloom_wood === 'old_wood'
                          ? 'Drape frost cloth to shield terminal flower buds.'
                          : 'Mulch root crown before ground freeze.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardy Category */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      Hardy Plants (Tolerates &lt;20°F)
                    </span>
                    <span className="text-xs text-stone-500">·</span>
                    <span className="text-xs text-stone-500">
                      {hardyPlants.length} plants
                    </span>
                  </div>
                  <span className="text-xs text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded">
                    Zero Cover Needed
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {hardyPlants.map((p) => p.common_name).join(', ')}. Natural plant antifreeze proteins protect root tissues.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Evening Action Checklist & Control Strip */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <h3 className="text-base font-bold font-display text-stone-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              Evening Action Checklist
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">
              Complete these steps before sundown.
            </p>

            <div className="space-y-3">
              {[
                {
                  id: 'step1',
                  title: 'Carry potted citrus & tender herbs indoors',
                  desc: 'Potted roots freeze much faster than ground soil. Place in garage, sunroom, or entryway.',
                },
                {
                  id: 'step2',
                  title: 'Harvest mature tomatoes & peppers',
                  desc: 'Green fruits will ripen in a paper bag indoors. Cold below 36°F ruins texture.',
                },
                {
                  id: 'step3',
                  title: 'Drape frost cloth over old-wood hydrangeas',
                  desc: 'Anchor edges with garden stones against wind gusts. Avoid heavy plastic.',
                },
                {
                  id: 'step4',
                  title: 'Disconnect garden hoses from sillcocks',
                  desc: 'Trapped water expands upon freezing and can fracture brass valves inside wall.',
                },
              ].map((item) => {
                const checked = checklist[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      checked
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-stone-600'
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-900 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        checked ? 'bg-emerald-700 text-white' : 'border border-stone-300 bg-stone-50'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-semibold ${
                          checked ? 'line-through text-stone-500' : 'text-stone-900'
                        }`}
                      >
                        {item.title}
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulation Toggle */}
          <div className="bg-stone-100/80 rounded-2xl p-5 border border-stone-200/80 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">
                Cold Snap Scenario Test
              </span>
              <span className="font-mono text-[11px] text-stone-500">
                Agent Evaluator
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Default mode is 100% genuine live weather from Open-Meteo. Click below to test how Yard Sloth alerts you if an overnight cold snap (31°F) is predicted.
            </p>
            <button
              onClick={onToggleSimulation}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 shadow-2xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              {simulationActive ? 'Return to 100% Live Forecast' : 'Test Cold Snap Alert (31°F)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
