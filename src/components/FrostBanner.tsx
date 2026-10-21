import React from 'react';
import { ShieldAlert, ShieldCheck, ThermometerSnowflake, Sparkles } from 'lucide-react';
import { FrostAlert } from '../types';

interface FrostBannerProps {
  alert: FrostAlert | null;
  simulationActive: boolean;
  onToggleSimulation: () => void;
  onViewTonight: () => void;
}

export const FrostBanner: React.FC<FrostBannerProps> = ({
  alert,
  simulationActive,
  onToggleSimulation,
  onViewTonight,
}) => {
  if (!alert) return null;

  const isFreezing = alert.severity === 'warning' || alert.severity === 'danger';

  return (
    <div
      className={`border-b transition-colors ${
        isFreezing
          ? 'bg-amber-50/90 border-amber-200/80 text-amber-950'
          : 'bg-emerald-50/80 border-emerald-200/70 text-emerald-950'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isFreezing ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isFreezing ? (
                <ThermometerSnowflake className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>

            <div className="text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold tracking-tight font-display">
                  {isFreezing ? 'Frost Watch Agent Alert' : 'Evening Garden Status'}
                </span>
                <span className="text-xs font-mono font-medium opacity-80 tabular-nums">
                  Overnight Low: {alert.temp_min_f}°F
                </span>
                {simulationActive && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                    Demo Frost Mode
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 text-stone-700 leading-snug">
                {alert.text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              onClick={onToggleSimulation}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-300/80 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-2xs whitespace-nowrap"
              title="Toggle between real live weather and simulated 31°F freeze alert"
            >
              {simulationActive ? 'Use Live Forecast' : 'Simulate Frost (31°F)'}
            </button>

            <button
              onClick={onViewTonight}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                isFreezing
                  ? 'bg-amber-900 text-amber-50 hover:bg-amber-800'
                  : 'bg-emerald-900 text-emerald-50 hover:bg-emerald-800'
              }`}
            >
              Action Plan →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
