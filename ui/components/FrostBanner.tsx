import React from 'react';
import { ShieldCheck, ThermometerSnowflake } from 'lucide-react';
import { FrostAlert } from '../shared/types';

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
                  {isFreezing ? 'Your Frost Watch Agent' : 'Evening Garden Status'}
                </span>
                <span className="text-xs font-mono font-medium opacity-80 tabular-nums">
                  Overnight Low: {alert.temp_min_f}°F
                </span>
                {simulationActive && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                    Test Mode (31°F)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 text-stone-700 leading-snug">
                {alert.text}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleSimulation}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-current/20 bg-white/60 hover:bg-white transition-colors"
            >
              {simulationActive ? 'Disable demo freeze' : 'Simulate 31°F tonight'}
            </button>
            {isFreezing && (
              <button
                type="button"
                onClick={onViewTonight}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
              >
                Tonight tab
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
