import React, { useState } from 'react';
import {
  ThermometerSnowflake,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CloudSun,
  Wind,
  Droplets,
  AlertTriangle,
  RefreshCw,
  Home,
  Check,
} from 'lucide-react';
import { ForecastDay, FrostAlert, PlantCandidate } from '../types';

interface TonightScreenProps {
  forecast: ForecastDay[];
  alert: FrostAlert | null;
  plants: PlantCandidate[];
  simulationActive: boolean;
  onToggleSimulation: () => void;
  onRefresh: () => void;
}

export const TonightScreen: React.FC<TonightScreenProps> = ({
  forecast,
  alert,
  plants,
  simulationActive,
  onToggleSimulation,
  onRefresh,
}) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  const toggleCheck = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isFreezing = alert && (alert.severity === 'warning' || alert.severity === 'danger');
  const tonight = forecast[0] || {
    temp_max: 58,
    temp_min: alert?.temp_min_f ?? 31,
    apparent_min: (alert?.temp_min_f ?? 31) - 2,
    precip_prob: 10,
    condition_text: 'Clear Sky',
  };

  const tenderPlants = plants.filter((p) => p.frost_sensitivity === 'tender');
  const semiHardyPlants = plants.filter((p) => p.frost_sensitivity === 'semi_hardy');
  const hardyPlants = plants.filter((p) => p.frost_sensitivity === 'hardy');

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Visual Card */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-900 text-stone-100">
        <img
          src="/src/assets/images/frost_protection_garden_1792452704827.jpg"
          alt="Evening autumn garden with protective frost fabric covering tender plants"
          referrerPolicy="no-referrer"
          className="w-full h-64 sm:h-80 object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent p-6 sm:p-8 flex flex-col justify-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-wider uppercase text-amber-300">
              <ThermometerSnowflake className="w-4 h-4" />
              <span>Evening Frost Watch Agent</span>
              <span>·</span>
              <span>Open-Meteo Forecast Stream</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight leading-tight">
              {isFreezing
                ? `Frost Alert: Overnight Low of ${tonight.temp_min}°F`
                : `Garden Safe: Overnight Low of ${tonight.temp_min}°F`}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-stone-200 leading-relaxed max-w-xl">
              {alert?.text || 'Code decides, models explain. Running deterministic threshold checks.'}
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
                  Refreshed daily from Open-Meteo local station. Zero API keys required.
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
              Thresholds calculated deterministically against confirmed yard census plants.
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
                        Action: Bring potted inside or harvest before freeze.
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
                          ? 'Drape frost cloth to protect terminal buds that bloom next year.'
                          : 'Mulch root crown before deep winter freezes.'}
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
                  {hardyPlants.map((p) => p.common_name).join(', ')}. Natural antifreeze proteins and root dormancy protect these species.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Evening Action Checklist & Control Strip */}
        <div className="space-y-6">
          {/* Action Checklist Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <h3 className="text-base font-bold font-display text-stone-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              Evening Action Checklist
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">
              Complete these steps before nightfall to prevent frost desiccation and cell rupture.
            </p>

            <div className="space-y-3">
              {[
                {
                  id: 'step1',
                  title: 'Wheel or carry potted citrus indoors',
                  desc: 'Potted roots freeze much faster than ground soil. Place in garage, sunroom, or entryway.',
                },
                {
                  id: 'step2',
                  title: 'Harvest remaining vine tomatoes & peppers',
                  desc: 'Mature green fruits will ripen in a cardboard box indoors at 65°F. Cold below 36°F spoils flesh.',
                },
                {
                  id: 'step3',
                  title: 'Drape frost cloth over old-wood hydrangeas',
                  desc: 'Do not let plastic touch foliage directly. Use breathable polypropylene fleece or old cotton bedsheets.',
                },
                {
                  id: 'step4',
                  title: 'Disconnect garden hoses from sillcocks',
                  desc: 'Trapped water expands upon freezing and can fracture brass anti-siphon valves inside wall.',
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

          {/* Frost Simulation Controller */}
          <div className="bg-stone-100/80 rounded-2xl p-5 border border-stone-200/80 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">
                Deterministic Agent Sandbox
              </span>
              <span className="font-mono text-[11px] text-stone-500">
                Frost Watch Agent
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              In production, the Frost Watch crew triggers automatically each evening via APScheduler. Toggle the simulation below to verify the threshold logic with a simulated 31°F freeze.
            </p>
            <button
              onClick={onToggleSimulation}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 shadow-2xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              {simulationActive ? 'Disable Demo Freeze (Use Real Temp)' : 'Simulate 31°F Frost Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
