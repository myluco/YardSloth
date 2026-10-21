import React, { useState } from 'react';
import {
  Check,
  X,
  Edit3,
  Trash2,
} from 'lucide-react';
import { PlantCandidate } from '../shared/types';

interface ConfirmPlantsPageProps {
  candidates: PlantCandidate[];
  plants: PlantCandidate[];
  onConfirm: (candidateId: string, editedData: Partial<PlantCandidate>) => void;
  onSkip: (candidateId: string) => void;
  onDeletePlant: (plantId: string) => void;
  onWalkYard: () => void;
}

export const ConfirmPlantsPage: React.FC<ConfirmPlantsPageProps> = ({
  candidates,
  plants,
  onConfirm,
  onSkip,
  onDeletePlant,
  onWalkYard,
}) => {
  const [editingCandidate, setEditingCandidate] = useState<PlantCandidate | null>(null);
  const [editForm, setEditForm] = useState({
    common_name: '',
    species: '',
    location_label: '',
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
              Human-in-the-loop review. The model makes its best botanical guess, and you confirm or adjust.
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
              const confidencePercent = Math.round(cand.confidence * 100);
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
                          {confidencePercent}%
                        </div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                          Confidence
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          confidencePercent >= 90
                            ? 'bg-emerald-600'
                            : confidencePercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-stone-400'
                        }`}
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase block font-mono">
                          Bloom Wood
                        </span>
                        <span className="font-semibold text-stone-800 capitalize">
                          {cand.bloom_wood.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase block font-mono">
                          Frost Threshold
                        </span>
                        <span className="font-semibold text-stone-800 font-mono tabular-nums">
                          ≤ {cand.frost_threshold_f}°F ({cand.frost_sensitivity})
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50/70 rounded-xl border border-stone-100 text-xs text-stone-600 leading-relaxed">
                      <span className="font-medium text-stone-900">Agent Reasoning: </span>
                      {cand.reasoning}
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
                    {plant.care_category.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs text-stone-600 font-medium mt-2">
                  📍 {plant.location_label}
                </div>

                <div className="mt-3 text-xs text-stone-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Pruning Wood:</span>
                    <span className="font-medium text-stone-800 capitalize">
                      {plant.bloom_wood.replace('_', ' ')}
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

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] text-stone-400 font-mono">
                  ID: {plant.id}
                </span>
                <button
                  onClick={() => onDeletePlant(plant.id)}
                  className="text-xs text-stone-400 hover:text-red-700 p-1.5 rounded transition-colors"
                  title="Remove plant and its calendar tasks"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
