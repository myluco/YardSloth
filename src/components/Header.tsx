import React from 'react';
import { Shovel, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import { FrostAlert } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  candidateCount: number;
  alert: FrostAlert | null;
  onOpenStory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  candidateCount,
  alert,
  onOpenStory,
}) => {
  const isFrostTonight = alert && (alert.severity === 'warning' || alert.severity === 'danger');

  return (
    <header className="sticky top-0 z-40 bg-[#fbfbf9]/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('tonight')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-amber-100 shadow-sm transition-transform group-hover:scale-105">
                <span className="font-display font-black text-lg">🦥</span>
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-stone-900 font-display whitespace-nowrap block leading-tight">
                  Yard Sloth
                </span>
                <span className="text-[11px] text-stone-500 font-medium block">
                  Local Garden AI
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: 4-5 Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              onClick={() => onSelectTab('tonight')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'tonight'
                  ? 'border-emerald-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Tonight
              {isFrostTonight && (
                <span className="text-amber-600 font-bold text-xs" title="Frost alert tonight">
                  • {alert.temp_min_f}°F
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('walk')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'walk'
                  ? 'border-emerald-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Yard Walk
            </button>

            <button
              onClick={() => onSelectTab('confirm')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'confirm'
                  ? 'border-emerald-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Plants & Census
              {candidateCount > 0 && (
                <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  {candidateCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'calendar'
                  ? 'border-emerald-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Care Calendar
            </button>

            <button
              onClick={() => onSelectTab('setup')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'setup'
                  ? 'border-emerald-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Settings
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Story Link */}
          <div className="flex items-center gap-3 shrink-0">
  
              <BookOpen className="w-3.5 h-3.5 text-stone-500" />
              Architecture & Post
            </button>

            <button
              onClick={() => onSelectTab('walk')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] rounded-xl shadow-sm transition-all whitespace-nowrap"
            >
              <Shovel className="w-3.5 h-3.5" />
              Walk Yard
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
