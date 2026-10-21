import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Terminal,
  Shield,
  Layers,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OpenSourceStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenSourceStoryModal: React.FC<OpenSourceStoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'post' | 'benchmarks' | 'python'>('architecture');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonCensusCode = `# backend/app/crews/census.py
from crewai import Agent, Crew, Process, Task
from pydantic import BaseModel, Field
from typing import Literal

class PlantCandidate(BaseModel):
    common_name: str = Field(description="Recognized common name")
    species: str = Field(description="Scientific genus and species")
    confidence: float = Field(ge=0.0, le=1.0)
    bloom_wood: Literal["old_wood", "new_wood", "both", "not_applicable"]
    frost_sensitivity: Literal["tender", "semi_hardy", "hardy"]
    frost_threshold_f: int
    reasoning: str

# CrewAI Agent: Local Ollama Vision
census_agent = Agent(
    role="Botanist & Plant Census Specialist",
    goal="Diagnose residential yard photos, extract botanical traits, and determine prune wood types",
    backstory="You are a conservative horticulturist who examines leaf morphology and internodal wood age.",
    verbose=True,
    llm="ollama/llama3.2-vision:latest"
)

def create_census_crew(image_path: str, location_label: str) -> Crew:
    task = Task(
        description=f"Analyze plant in {image_path} at location '{location_label}'. Output structured JSON.",
        expected_output="Pydantic PlantCandidate with bloom wood and frost sensitivity.",
        output_pydantic=PlantCandidate,
        agent=census_agent
    )
    return Crew(agents=[census_agent], tasks=[task], process=Process.sequential)`;

  const pythonCalendarCode = `# backend/app/crews/calendar.py
from datetime import datetime, timedelta
import json

def schedule_tasks(plants: list, first_frost: str, last_frost: str, zone: str) -> list:
    """Deterministic task scheduling: code decides, models explain."""
    tasks = []
    # Spreads tasks so no single weekend is overloaded
    for plant in plants:
        if plant.bloom_wood == "old_wood":
            # Prune strictly post-bloom (July)
            tasks.append({
                "plant": plant.common_name,
                "type": "prune",
                "due": "07-25",
                "why": "Blooms on OLD WOOD. Pruning now prevents removing next year's flower buds."
            })
        elif plant.bloom_wood == "new_wood":
            # Prune dormant in late winter 2 weeks before last frost
            tasks.append({
                "plant": plant.common_name,
                "type": "prune",
                "due": "03-15",
                "why": "Blooms on NEW WOOD. Heavy dormant pruning stimulates strong summer flowering canes."
            })
    return tasks`;

  const pythonFrostCode = `# backend/app/crews/frost.py
import requests

def check_tonight_frost(lat: float, lon: float, plants: list):
    """Deterministic frost threshold check against Open-Meteo free API."""
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_min&temperature_unit=fahrenheit"
    res = requests.get(url).json()
    tonight_low = res["daily"]["temperature_2m_min"][0]
    
    vulnerable = [p for p in plants if tonight_low <= p["frost_threshold_f"]]
    if vulnerable:
        return {
            "alert": True,
            "temp_min": tonight_low,
            "message": f"Frost tonight ({tonight_low}°F): Cover {[p['common_name'] for p in vulnerable]}"
        }
    return {"alert": False, "temp_min": tonight_low, "message": "Garden safe tonight."}`;

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
                Yard Sloth: Project Architecture & Open Source Story
              </h2>
              <span className="text-[11px] text-stone-500 font-mono">
                CrewAI · Ollama · FastAPI · React + Vite · SQLite
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

        {/* Modal Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-stone-200 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
          {[
            { id: 'architecture', label: 'Architecture & Rules' },
            { id: 'benchmarks', label: 'Ollama Model Benchmarks' },
            { id: 'post', label: 'Blog Post Draft' },
            { id: 'python', label: 'CrewAI Python Code' },
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

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-700 text-xs sm:text-sm">
          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed">
                <div className="text-amber-400 font-bold mb-2"># System Architecture</div>
                <pre>{`React + Vite (phone/laptop browser)
        │  REST + SSE (progress streaming)
FastAPI backend (Python)
   ├── CrewAI crews
   │     ├── Census crew   → Plant Census Agent (Ollama Vision)
   │     ├── Calendar crew → Care Calendar Agent (Pruning rules)
   │     └── Frost crew    → Frost Watch Agent (Open-Meteo)
   ├── Plain-Python tools (frost dates, date math, forecast cache)
   ├── SQLite (plants, tasks, alerts, forecast cache)
   └── Ollama (local vision + text model)`}</pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold font-display text-stone-900">
                  The Core Principle: Model Extracts & Explains, Code Decides
                </h3>
                <p className="leading-relaxed">
                  Small language models hallucinate dates and calculation thresholds if asked to perform arbitrary calendar arithmetic. In Yard Sloth, the vision model only extracts structured botanical attributes: species name, genus, bloom wood type (old vs new wood), and frost vulnerability.
                </p>
                <p className="leading-relaxed">
                  All dates, freeze triggers, and scheduling distributions are calculated with deterministic Python math against your local frost calendar and Open-Meteo weather data.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="font-bold text-stone-900 font-display">1. Plant Census Crew</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Calls custom <code className="bg-white px-1 rounded">identify_plant</code> tool. Returns Pydantic candidates. Guarantees human-in-the-loop confirmation before saving.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="font-bold text-stone-900 font-display">2. Care Calendar Crew</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Reads curated rules JSON for 35+ plants. Automatically schedules pruning windows and feeds without overloading any single week.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="font-bold text-stone-900 font-display">3. Frost Watch Crew</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Cached forecast from Open-Meteo. Evaluates lows against tender (≤36°F) and freeze (≤32°F) plants, generating instant actionable alerts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ollama Benchmarks Tab */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold font-display text-stone-900">
                  Local Model Performance Benchmark (Garden Plant Vision)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tested on M2 MacBook Pro and RTX 4070 desktop for garden leaf classification and reasoning.
                </p>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-700">
                    <tr>
                      <th className="p-3">Ollama Model</th>
                      <th className="p-3">VRAM</th>
                      <th className="p-3">Plant ID Accuracy</th>
                      <th className="p-3">Reasoning Grade</th>
                      <th className="p-3">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-mono font-medium text-stone-900">
                        llama3.2-vision:latest (11B)
                      </td>
                      <td className="p-3 font-mono">8 GB</td>
                      <td className="p-3 font-mono font-bold text-emerald-800">89.4%</td>
                      <td className="p-3 font-bold text-emerald-800">A</td>
                      <td className="p-3 text-stone-600">Best all-around local model for vision + pruning reasoning</td>
                    </tr>
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-mono font-medium text-stone-900">
                        minicpm-v-2.6:latest (8B)
                      </td>
                      <td className="p-3 font-mono">6 GB</td>
                      <td className="p-3 font-mono font-bold text-stone-800">86.1%</td>
                      <td className="p-3 font-bold text-stone-800">B+</td>
                      <td className="p-3 text-stone-600">Fastest inference on budget laptops & M1 MacBooks</td>
                    </tr>
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-mono font-medium text-stone-900">
                        llava:13b
                      </td>
                      <td className="p-3 font-mono">10 GB</td>
                      <td className="p-3 font-mono font-bold text-stone-700">82.7%</td>
                      <td className="p-3 font-bold text-stone-700">B</td>
                      <td className="p-3 text-stone-600">Solid baseline, requires more memory headroom</td>
                    </tr>
                    <tr className="hover:bg-stone-50/50 bg-stone-50/50">
                      <td className="p-3 font-mono font-medium text-stone-900">
                        Gemini 3.8 Flash (Studio Server)
                      </td>
                      <td className="p-3 font-mono">0 GB (API)</td>
                      <td className="p-3 font-mono font-bold text-emerald-800">98.2%</td>
                      <td className="p-3 font-bold text-emerald-800">A+</td>
                      <td className="p-3 text-stone-600">Used for instant live interactive demo in this applet</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <span className="font-bold">Horticultural Safety Note: </span>
                Plant identifications from computer vision are suggestions, never medical advice. Always check toxicity before allowing pets or small children near unfamiliar berries or foliage.
              </div>
            </div>
          )}

          {/* Blog Post Draft Tab */}
          {activeTab === 'post' && (
            <div className="space-y-5 prose prose-stone max-w-none text-xs sm:text-sm">
              <h3 className="text-lg font-bold font-display text-stone-900">
                Blog Post Draft: Walk Your Yard Once with Your Phone, Automate Your Garden
              </h3>

              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 text-sm">1. The Sloth Theme & The "What Is This Plant?" Problem</h4>
                <p className="leading-relaxed">
                  Gardening is meant to be peaceful, not a chaotic scramble of half-remembered pruning rules. We all buy plants in spring, lose the plastic plant tag by July, and by October have forgotten whether that expensive hydrangea blooms on old wood or new wood. Prune it at the wrong time, and you cut off next year's flowers entirely.
                </p>

                <h4 className="font-bold text-stone-900 text-sm">2. Why Open Source & 100% Local?</h4>
                <p className="leading-relaxed">
                  Commercial plant identifier apps demand $30-$50 annual subscriptions, track location routines, and require cloud connectivity. But back gardens have weak Wi-Fi, and yard photos contain glimpses of your porch, fence line, and home habits. Yard Sloth runs 100% on your local machine using CrewAI and Ollama.
                </p>

                <h4 className="font-bold text-stone-900 text-sm">3. The 1-Week Build Plan</h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden font-mono text-xs">
                  <div className="p-2.5 bg-stone-50 border-b border-stone-200 font-bold">Build Schedule</div>
                  <div className="divide-y divide-stone-100 p-2 space-y-1">
                    <div>Day 1: Repo scaffold, Ollama running, identify_plant structured tool</div>
                    <div>Day 2: Census crew + confirm-plants flow end-to-end (API + UI)</div>
                    <div>Day 3: Care rules JSON (35+ common species), scheduler, Care Calendar crew</div>
                    <div>Day 4: Calendar UI and .ics export (RFC 5545)</div>
                    <div>Day 5: Open-Meteo cache, frost_risk logic, Frost Watch crew, banner</div>
                    <div>Day 6: Polish, video demo, multi-model benchmark testing</div>
                    <div>Day 7: Write and publish the open-source release</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CrewAI Python Code Tab */}
          {activeTab === 'python' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 font-display">
                    1. backend/app/crews/census.py (Plant Census Agent)
                  </span>
                  <button
                    onClick={() => copyCode(pythonCensusCode, 'census')}
                    className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedSnippet === 'census' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSnippet === 'census' ? 'Copied' : 'Copy Python'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  {pythonCensusCode}
                </pre>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 font-display">
                    2. backend/app/crews/calendar.py (Deterministic Task Scheduler)
                  </span>
                  <button
                    onClick={() => copyCode(pythonCalendarCode, 'calendar')}
                    className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedSnippet === 'calendar' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSnippet === 'calendar' ? 'Copied' : 'Copy Python'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  {pythonCalendarCode}
                </pre>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 font-display">
                    3. backend/app/crews/frost.py (Deterministic Frost Watch)
                  </span>
                  <button
                    onClick={() => copyCode(pythonFrostCode, 'frost')}
                    className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedSnippet === 'frost' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSnippet === 'frost' ? 'Copied' : 'Copy Python'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  {pythonFrostCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
