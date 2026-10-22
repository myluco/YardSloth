import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Leaf,
  Sparkles,
} from 'lucide-react';
import { PlantCandidate, Settings } from '../shared/types';
import { collectInUseLocationLabels } from '../shared/yardLocations';
import { api } from '../shared/api';

interface YardWalkPageProps {
  settings: Settings;
  plants: PlantCandidate[];
  onCandidateAdded: (candidate: PlantCandidate, settings?: Settings) => Promise<void>;
  onGoToConfirm: () => void;
}

export const YardWalkPage: React.FC<YardWalkPageProps> = ({
  settings,
  plants,
  onCandidateAdded,
  onGoToConfirm,
}) => {
  const [locationLabel, setLocationLabel] = useState('');
  const [plantName, setPlantName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<
    Array<{ step: string; status: 'pending' | 'running' | 'done' }>
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFoundCandidate, setLastFoundCandidate] = useState<PlantCandidate | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const plantLocationOptions = useMemo(
    () => collectInUseLocationLabels(plants),
    [plants]
  );

  useEffect(() => {
    const last = (settings.last_location_label || '').trim();
    if (last && plantLocationOptions.includes(last)) {
      setLocationLabel(last);
    }
  }, [settings.last_location_label, plantLocationOptions]);

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

  const runCensusAgent = async (base64?: string) => {
    const name = plantName.trim();
    const yardSpot = locationLabel.trim();
    if (!yardSpot) {
      setErrorMsg('Enter a location label for where this plant is in your yard (e.g. Frontyard).');
      return;
    }
    if (!name) {
      setErrorMsg('Enter a plant name (common or scientific). You can add a photo too.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setLastFoundCandidate(null);

    const initialSteps = [
      { step: '1. Plant Census Agent (Python CrewAI) initialized', status: 'running' as const },
      { step: '2. Querying Ollama (gemma4:31b-cloud) for botanical care profile', status: 'pending' as const },
      { step: '3. Parsing structured JSON: bloom wood, frost threshold, pruning rules', status: 'pending' as const },
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
        location_label: yardSpot,
        plant_name: name,
        image_base64: base64 ?? selectedPhoto ?? undefined,
        sample_species: name,
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
      await onCandidateAdded(result.candidate, result.settings);
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
              Type the plant name, add an optional photo, and the Census Agent pulls bloom wood and care traits via live MCP lookup for your review.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Input & Location Tagging */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs">
            <h2 className="text-lg font-bold font-display text-stone-900 mb-1">
              1. Location, Plant Name & Photo
            </h2>
            <p className="text-xs text-stone-500 mb-5">
              The <strong className="text-stone-700">location label</strong> marks where this plant lives in your yard.
              The same species can be added many times with different labels (e.g. two hydrangeas in different beds).
              Quick picks below come from locations you already use on confirmed plants.
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
                  placeholder="Frontyard"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
                />
              </div>

              {plantLocationOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {plantLocationOptions.map((loc) => (
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
              )}
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-stone-700">
                Plant name (common or scientific)
              </label>
              <div className="relative">
                <Leaf className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={plantName}
                  onChange={(e) => {
                    setPlantName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. Bigleaf Hydrangea or Hydrangea macrophylla"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
                />
              </div>
              <span className="block text-[11px] text-stone-400">
                Required. Ollama (gemma4:31b-cloud) generates the care profile from this name.
              </span>
            </div>

            {/* Photo Capture Area */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-stone-700">
                Photo (optional)
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

              {errorMsg ? (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {errorMsg}
                </p>
              ) : null}

              {lastFoundCandidate && !isAnalyzing ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        Queued for review: {lastFoundCandidate.common_name}
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Open <strong>Plants &amp; Census</strong> and confirm to add it to your yard.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToConfirm}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-emerald-800 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Review &amp; confirm plant
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : null}

              <button
                disabled={isAnalyzing || !plantName.trim()}
                onClick={() => runCensusAgent()}
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
                    Identify Plant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};
