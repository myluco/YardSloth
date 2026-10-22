import React, { useMemo, useState } from 'react';
import {
  Check,
  X,
  Edit3,
  Trash2,
} from 'lucide-react';
import { PlantCandidate, Settings } from '../shared/types';
import {
  collectInUseLocationLabels,
  formatPlantLocations,
  getPlantLocationLabels,
  normalizeLocationLabel,
} from '../shared/yardLocations';

function labelFromSnake(value?: string, fallback = 'Unknown'): string {
  if (!value) return fallback;
  return value.replace(/_/g, ' ');
}

function confidencePercent(confidence?: number): number {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 0;
  return Math.round(confidence * 100);
}

interface ConfirmPlantsPageProps {
  settings: Settings;
  candidates: PlantCandidate[];
  plants: PlantCandidate[];
  onConfirm: (candidateId: string, editedData: Partial<PlantCandidate>) => void;
  onSkip: (candidateId: string) => void;
  onDeletePlant: (plantId: string) => void;
  onUpdatePlant: (
    plantId: string,
    updates: Partial<Pick<PlantCandidate, 'location_label' | 'common_name' | 'species' | 'notes'>>
  ) => Promise<void>;
  onYardLocationsSave: (payload: {
    rename?: Record<string, string>;
    plant_id?: string;
    location_labels?: string[];
  }) => Promise<void>;
  onWalkYard: () => void;
}

export const ConfirmPlantsPage: React.FC<ConfirmPlantsPageProps> = ({
  settings,
  candidates,
  plants,
  onConfirm,
  onSkip,
  onDeletePlant,
  onUpdatePlant,
  onYardLocationsSave,
  onWalkYard,
}) => {
  const [editingCandidate, setEditingCandidate] = useState<PlantCandidate | null>(null);
  const [editForm, setEditForm] = useState({
    common_name: '',
    species: '',
    location_label: '',
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [selectedPlantLocations, setSelectedPlantLocations] = useState<string[]>([]);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [locationSaveError, setLocationSaveError] = useState<string | null>(null);
  const [isSavingLocations, setIsSavingLocations] = useState(false);

  const locationLabelPool = useMemo(() => {
    const pool = new Set(collectInUseLocationLabels(plants, candidates));
    for (const label of selectedPlantLocations) {
      pool.add(label);
    }
    return Array.from(pool);
  }, [plants, candidates, selectedPlantLocations]);

  const openLocationEditor = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    setSelectedPlantLocations(plant ? getPlantLocationLabels(plant) : []);
    setNewLocationInput('');
    setLocationSaveError(null);
    setEditingPlantId(plantId);
  };

  const togglePlantLocation = (label: string) => {
    setSelectedPlantLocations((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const addNewLocationForPlant = () => {
    const clean = normalizeLocationLabel(newLocationInput);
    if (!clean) {
      setLocationSaveError('Enter a location label to add.');
      return;
    }
    setLocationSaveError(null);
    setSelectedPlantLocations((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setNewLocationInput('');
  };

  const saveLocationEditor = async () => {
    if (!editingPlantId) return;
    const labels = Array.from(
      new Set(selectedPlantLocations.map((l) => normalizeLocationLabel(l)).filter(Boolean))
    );
    if (labels.length < 1) {
      setLocationSaveError('Select or add at least one location for this plant.');
      return;
    }
    setIsSavingLocations(true);
    setLocationSaveError(null);
    try {
      await onYardLocationsSave({
        plant_id: editingPlantId,
        location_labels: labels,
      });
      setEditingPlantId(null);
    } catch (err) {
      setLocationSaveError(err instanceof Error ? err.message : 'Could not save locations.');
    } finally {
      setIsSavingLocations(false);
    }
  };

  const editingPlant = editingPlantId
    ? plants.find((p) => p.id === editingPlantId)
    : undefined;

  const startEdit = (candidate: PlantCandidate) => {
    setEditingCandidate(candidate);
    setEditForm({
      common_name: candidate.common_name,
      species: candidate.species,
      location_label: candidate.location_label,
    });
  };

  const saveEditAndConfirm = () => {
    if (!editingCandidate) return;
    onConfirm(editingCandidate.id, {
      common_name: editForm.common_name,
      species: editForm.species,
      location_label: editForm.location_label,
    });
    setEditingCandidate(null);
  };

  const filteredPlants = plants.filter((p) => {
    if (categoryFilter === 'all') return true;
    return p.care_category === categoryFilter;
  });

  return (
    <div className="space-y-10 pb-12">
      {/* Top Section: Pending Candidates */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
                Plant Census Candidates
              </h1>
              {candidates.length > 0 && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  {candidates.length} Awaiting Confirmation
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Plants from Yard Walk land here first. Confirm one to move it into your yard list below.
            </p>
          </div>

          <button
            onClick={onWalkYard}
            className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors shrink-0 self-start sm:self-auto"
          >
            + Snap More Plants
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-stone-200 bg-white text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">All caught up!</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              No pending plant guesses waiting for confirmation. Take your phone into the yard or try one of the quick test samples.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {candidates.map((cand) => {
              const pct = confidencePercent(cand.confidence);
              return (
                <div
                  key={cand.id}
                  className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold font-display text-stone-900">
                          {cand.common_name}
                        </h3>
                        <div className="text-xs text-stone-500 italic mt-0.5">
                          {cand.species}
                        </div>
                        <div className="text-xs text-stone-600 mt-1 font-medium">
                          📍 {cand.location_label}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold tabular-nums text-stone-900">
                          {pct}%
                        </div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                          Confidence
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 90
                            ? 'bg-emerald-600'
                            : pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-stone-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase block font-mono">
                          Bloom Wood
                        </span>
                        <span className="font-semibold text-stone-800 capitalize">
                          {labelFromSnake(cand.bloom_wood)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase block font-mono">
                          Frost Threshold
                        </span>
                        <span className="font-semibold text-stone-800 font-mono tabular-nums">
                          ≤ {cand.frost_threshold_f ?? '—'}°F ({cand.frost_sensitivity ?? 'unknown'})
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50/70 rounded-xl border border-stone-100 text-xs text-stone-600 leading-relaxed space-y-2">
                      <div>
                        <span className="font-medium text-stone-900">Agent reasoning: </span>
                        {cand.reasoning}
                      </div>
                      {cand.source ? (
                        <div className="font-mono text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                          Profile source: {cand.source}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSkip(cand.id)}
                      className="px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Skip
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(cand)}
                        className="px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <button
                        onClick={() => onConfirm(cand.id, {})}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirm Plant
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmed Plants Section */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-stone-900">
              Confirmed Yard Plants ({plants.length})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Held in Python agent memory. Forms the basis for the Care Calendar and evening Frost Watch alerts.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
            {['all', 'shrub', 'perennial', 'vegetable', 'fruit_tree', 'herb'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat === 'all'
                  ? 'All Plants'
                  : cat === 'fruit_tree'
                  ? 'Fruit Trees'
                  : cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold font-display text-stone-900">
                      {plant.common_name}
                    </h4>
                    <div className="text-xs text-stone-500 italic mt-0.5">
                      {plant.species}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded capitalize">
                    {labelFromSnake(plant.care_category, 'plant')}
                  </span>
                </div>

                <div className="text-xs text-stone-600 font-medium mt-2">
                  📍 {formatPlantLocations(plant)}
                </div>

                <div className="mt-3 text-xs text-stone-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Pruning Wood:</span>
                    <span className="font-medium text-stone-800 capitalize">
                      {labelFromSnake(plant.bloom_wood)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Cold Hardiness:</span>
                    <span className="font-mono text-stone-800 tabular-nums font-medium">
                      {plant.frost_sensitivity} (≤{plant.frost_threshold_f}°F)
                    </span>
                  </div>
                </div>

                {plant.notes && (
                  <p className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500 leading-relaxed">
                    {plant.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-stone-400 font-mono">
                  ID: {plant.id}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openLocationEditor(plant.id)}
                    className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 rounded-lg border border-stone-200"
                  >
                    Edit location
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePlant(plant.id)}
                    className="text-xs text-stone-400 hover:text-red-700 p-1.5 rounded transition-colors"
                    title="Remove plant and its calendar tasks"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingPlantId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-display text-stone-900">
              Locations for this plant
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              {editingPlant?.common_name
                ? `Choose every spot where “${editingPlant.common_name}” appears in your yard. You can select multiple labels.`
                : 'Choose every spot where this plant appears in your yard.'}
              {' '}Only labels already used on your plants are listed below.
            </p>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide">
                Used in your yard
              </div>
              {locationLabelPool.length === 0 ? (
                <p className="text-xs text-stone-500">No locations yet — add one below.</p>
              ) : (
                <ul className="space-y-2">
                  {locationLabelPool.map((label) => (
                    <li key={label}>
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-stone-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlantLocations.includes(label)}
                          onChange={() => togglePlantLocation(label)}
                          className="mt-0.5 text-emerald-800 focus:ring-emerald-700"
                        />
                        <span className="text-sm text-stone-800">{label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide">
                Add a new location label
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  placeholder="Frontyard"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={addNewLocationForPlant}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 hover:bg-stone-50"
                >
                  Add
                </button>
              </div>
            </div>

            {locationSaveError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {locationSaveError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEditingPlantId(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
                disabled={isSavingLocations}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveLocationEditor()}
                disabled={isSavingLocations}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {isSavingLocations ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-lg font-bold font-display text-stone-900">
              Edit Plant Candidate
            </h3>
            <p className="text-xs text-stone-500">
              Correct botanical name or adjust the location label before confirming.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Common Name
                </label>
                <input
                  type="text"
                  value={editForm.common_name}
                  onChange={(e) => setEditForm({ ...editForm, common_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Scientific Name / Species
                </label>
                <input
                  type="text"
                  value={editForm.species}
                  onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Location in Yard
                </label>
                <input
                  type="text"
                  value={editForm.location_label}
                  onChange={(e) => setEditForm({ ...editForm, location_label: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCandidate(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={saveEditAndConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Save & Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
