import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, Shield, Globe } from 'lucide-react';

interface OpenSourceStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenSourceStoryModal: React.FC<OpenSourceStoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'mcp' | 'code'>('architecture');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonMCPToolSnippet = `# agents/mcp/web_browser_tool.py
import urllib.request, json

class WebBrowserMCPTool:
    """MCP tool for real-time web browsing without storing data files."""
    def browse_weather_forecast(self, lat: float, lon: float):
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_min&temperature_unit=fahrenheit"
        req = urllib.request.Request(url, headers={"User-Agent": "YardSloth-MCP/1.0"})
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())

    def browse_plant_care_knowledge(self, plant_name: str):
        """Web search for bloom wood type (old vs new wood) on the fly."""
        # Queries live botanical databases via MCP tool call
        ...`;

  const pythonServerSnippet = `# server/main.py
from server.server.config import HOST, PORT
from server.server.http_server import run_server
from agents.main import pipeline

if __name__ == "__main__":
    print("Pre-initializing agents and memory state...")
    pipeline.run_calendar()
    print(f"Starting Python HTTP Server on http://{HOST}:{PORT}...")
    run_server(host=HOST, port=PORT)`;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center text-sm font-bold">
              🦥
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-stone-900">
                Yard Sloth: Pure Python + CrewAI + MCP Architecture
              </h2>
              <span className="text-[11px] text-stone-500 font-mono">
                Zero Stored Data Files · Ephemeral In-Memory · Live Web Browsing MCP
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-3 border-b border-stone-200 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
          {[
            { id: 'architecture', label: 'Root Directory Layout' },
            { id: 'mcp', label: 'MCP Live Web Browsing' },
            { id: 'code', label: 'Python Codebase' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-700 text-xs sm:text-sm">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed">
                <div className="text-amber-400 font-bold mb-2"># Strict Root Directory Layout</div>
                <pre>{`.
├── agents/             # CrewAI multi-agent subsystem
│   ├── agent/         # Census, Calendar, and Frost agents
│   ├── assets/        # Prompts and role personas
│   ├── mcp/           # MCP live web browser tool
│   ├── memory/        # Zero-disk in-memory state
│   ├── main.py        # CrewAI pipeline coordinator
│   └── README.md
├── server/             # 100% Pure Python HTTP backend
│   ├── api/           # Route dispatchers (routes.py)
│   ├── server/        # Multithreaded HTTP server engine
│   ├── main.py        # Server entry point
│   └── README.md
├── ui/                 # Clean React/JavaScript presentation layer
│   ├── assets/        # Visual imagery and stylesheets
│   ├── components/    # Reusable UI controls
│   ├── pages/         # Tonight, Yard Walk, Census, Calendar, Setup
│   ├── shared/        # Types and API client
│   └── README.md
└── README.md           # Master system documentation`}</pre>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold font-display text-stone-900">
                  No Data Stored on Disk (care_rules.json and frost_dates.json Prohibited)
                </h3>
                <p className="leading-relaxed">
                  Per system design, no static plant rules or frost tables exist. Instead, when an agent requires botanical traits (such as whether a Hydrangea blooms on old wood or new wood) or local freeze dates, it dispatches an MCP web browsing tool call to fetch live information from meteorological and botanical sources.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <Globe className="w-6 h-6 text-emerald-800 shrink-0" />
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Model Context Protocol (MCP) Web Tool</h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Live dynamic lookups replace all local CSVs and JSON stores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                  <div className="font-bold text-stone-900 text-xs font-mono">web_browse_weather</div>
                  <p className="text-xs text-stone-600">
                    Queries Open-Meteo's live API for 7-day minimum temperatures and precipitation probability.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                  <div className="font-bold text-stone-900 text-xs font-mono">web_browse_frost_dates</div>
                  <p className="text-xs text-stone-600">
                    Resolves ZIP code into coordinates, USDA hardiness zone, and spring/fall frost dates on the fly.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                  <div className="font-bold text-stone-900 text-xs font-mono">web_browse_plant_care</div>
                  <p className="text-xs text-stone-600">
                    Extracts bloom wood type (old vs new wood) and frost sensitivity for confirmed species.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-stone-900">agents/mcp/web_browser_tool.py</span>
                  <button
                    onClick={() => copyCode(pythonMCPToolSnippet, 'mcp')}
                    className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-md flex items-center gap-1 font-sans"
                  >
                    {copiedSnippet === 'mcp' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto">
                  {pythonMCPToolSnippet}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-stone-900">server/main.py</span>
                  <button
                    onClick={() => copyCode(pythonServerSnippet, 'server')}
                    className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-md flex items-center gap-1 font-sans"
                  >
                    {copiedSnippet === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto">
                  {pythonServerSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
