import React, { useState, useRef } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Leaf,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PlantCandidate } from '../shared/types';
import { api } from '../shared/api';

interface YardWalkPageProps {
  onCandidateAdded: (candidate: PlantCandidate) => void;
  onGoToConfirm: () => void;
}

export const YardWalkPage: React.FC<YardWalkPageProps> = ({
  onCandidateAdded,
  onGoToConfirm,
}) => {
  const [locationLabel, setLocationLabel] = useState('Front bed, left of steps');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<
    Array<{ step: string; status: 'pending' | 'running' | 'done' }>
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFoundCandidate, setLastFoundCandidate] = useState<PlantCandidate | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePlants = [
    { name: 'Bigleaf Hydrangea', location: 'Front border steps', species: 'Hydrangea macrophylla' },
    { name: 'San Marzano Tomato', location: 'Cedar raised box #1', species: 'Solanum lycopersicum' },
    { name: 'Meyer Lemon', location: 'South deck container', species: 'Citrus x meyeri' },
    { name: 'Garden Rose', location: 'Walkway trellised arbor', species: 'Rosa spp.' },
    { name: 'English Lavender', location: 'West rockery terrace', species: 'Lavandula angustifolia' },
    { name: 'Common Fig', location: 'South stone wall espalier', species: 'Ficus carica' },
  ];

  const presetLocations = [
    'Front bed, left of steps',
    'Cedar raised box #1',
    'South deck containers',
    'Walkway trellised arbor',
    'East fence shade border',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedPhoto(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runCensusAgent = async (options: { sampleSpecies?: string; base64?: string }) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setLastFoundCandidate(null);

    const initialSteps = [
      { step: '1. Plant Census Agent (Python CrewAI) initialized', status: 'running' as const },
      { step: '2. Dispatching MCP web browsing tool: web_browse_plant_care', status: 'pending' as const },
      { step: '3. Extracting botanical leaf margins and bloom wood traits on the fly', status: 'pending' as const },
      { step: '4. Zero disk storage: saving directly into agent ephemeral memory', status: 'pending' as const },
      { step: '5. Candidate prepared for human-in-the-loop review', status: 'pending' as const },
    ];
    setAnalysisLogs(initialSteps);

    try {
      await new Promise((r) => setTimeout(r, 500));
      setAnalysisLogs((prev) => [
        { ...prev[0], status: 'done' },
        { ...prev[1], status: 'running' },
        ...prev.slice(2),
      ]);

      await new Promise((r) => setTimeout(r, 600));
      setAnalysisLogs((prev) => [
        prev[0],
        { ...prev[1], status: 'done' },
        { ...prev[2], status: 'running' },
        ...prev.slice(3),
      ]);

      const result = await api.identifyPlant({
        location_label: locationLabel,
        image_base64: options.base64 || selectedPhoto || undefined,
        sample_species: options.sampleSpecies,
      });

      await new Promise((r) => setTimeout(r, 500));
      setAnalysisLogs((prev) => [
        prev[0],
        prev[1],
        { ...prev[2], status: 'done' },
        { ...prev[3], status: 'running' },
        prev[4],
      ]);

      await new Promise((r) => setTimeout(r, 400));
      setAnalysisLogs((prev) => [
        prev[0],
        prev[1],
        prev[2],
        { ...prev[3], status: 'done' },
        { ...prev[4], status: 'done' },
      ]);

      setLastFoundCandidate(result.candidate);
      onCandidateAdded(result.candidate);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Plant identification failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-900 text-stone-100">
        <img
          src="/ui/assets/images/yard_walk_garden_1792452705366.jpg"
          alt="Home garden walk path"
          referrerPolicy="no-referrer"
          className="w-full h-48 sm:h-64 object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/50 to-transparent p-6 sm:p-8 flex flex-col justify-end">
          <div className="max-w-2xl">
            <span className="text-xs font-mono tracking-wider uppercase text-emerald-300">
              Plant Census Agent · Python + MCP Tooling
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight mt-1">
              Walk Your Yard, Snap What You See
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
              Capture plants with your phone. The Census Agent identifies the specimen and bloom wood classification via live MCP lookup, queuing candidates for your review.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Input & Location Tagging */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <h2 className="text-lg font-bold font-display text-stone-900 mb-1">
              1. Location & Photo Capture
            </h2>
            <p className="text-xs text-stone-500 mb-5">
              Tag the location so tasks specify exact beds in your yard.
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-stone-700">
                Location Label in Your Yard
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Front bed, left of steps"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocationLabel(loc)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      locationLabel === loc
                        ? 'bg-stone-900 text-stone-100 border-stone-900 font-medium'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture Area */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-stone-700">
                Take Photo or Upload Image
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 aspect-video max-h-64 flex items-center justify-center">
                  <img
                    src={selectedPhoto}
                    alt="Selected plant"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium bg-stone-900/80 text-white rounded-lg hover:bg-stone-900 backdrop-blur-xs transition-colors"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-emerald-700/60 rounded-xl p-8 text-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-stone-900">
                    Tap to use Phone Camera or upload photo
                  </div>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs">
                    Clear shots of leaves or flower buds yield highest confidence.
                  </p>
                </div>
              )}

              <button
                disabled={isAnalyzing || !selectedPhoto}
                onClick={() => runCensusAgent({ base64: selectedPhoto! })}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Plant Census Agent Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    Identify with Plant Census Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Test Samples */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold font-display text-stone-900">
                Quick Test Samples (Instant Desktop Testing)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Click any sample below to execute the Python Census Agent and dispatch the live MCP botanical web lookup tool.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {samplePlants.map((s) => (
                <button
                  key={s.name}
                  disabled={isAnalyzing}
                  onClick={() => {
                    setLocationLabel(s.location);
                    runCensusAgent({ sampleSpecies: s.name });
                  }}
                  className="text-left p-3 rounded-xl border border-stone-200 bg-white hover:border-emerald-700/50 hover:bg-emerald-50/20 text-xs transition-all disabled:opacity-50"
                >
                  <div className="font-semibold text-stone-900 truncate">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate italic">
                    {s.species}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1 font-medium">
                    Run Census →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Trace */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-display text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-600" />
                Live Agent Execution Trace
              </h3>
              <span className="text-[11px] font-mono text-stone-500">
                Python CrewAI + MCP
              </span>
            </div>

            {analysisLogs.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs">
                Agent is idle. Select a photo or sample plant to inspect the reasoning chain.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {analysisLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all ${
                      log.status === 'running'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950 animate-pulse'
                        : log.status === 'done'
                        ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-950'
                        : 'bg-stone-50 border-stone-100 text-stone-400'
                    }`}
                  >
                    {log.status === 'running' && (
                      <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin shrink-0 mt-0.5" />
                    )}
                    {log.status === 'done' && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    )}
                    {log.status === 'pending' && (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug">{log.step}</span>
                  </div>
                ))}
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {lastFoundCandidate && (
            <div className="bg-emerald-50/80 rounded-2xl p-6 border border-emerald-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 font-mono">
                  Candidate Ready for Confirmation
                </span>
                <span className="font-mono text-xs font-bold text-emerald-900 tabular-nums">
                  {Math.round(lastFoundCandidate.confidence * 100)}% Confidence
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold font-display text-stone-900">
                  {lastFoundCandidate.common_name}
                </h4>
                <div className="text-xs text-stone-600 italic">
                  {lastFoundCandidate.species} · Genus: {lastFoundCandidate.genus}
                </div>
                <div className="text-xs text-stone-600 mt-1">
                  Location: {lastFoundCandidate.location_label}
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 text-xs text-stone-700 leading-relaxed">
                <span className="font-semibold text-stone-900">Agent Reasoning: </span>
                {lastFoundCandidate.reasoning}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onGoToConfirm}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-900 hover:bg-emerald-800 text-white shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  Review in Confirm Screen
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
