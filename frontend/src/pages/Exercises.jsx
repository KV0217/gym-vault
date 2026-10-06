import React, { useState, useEffect } from 'react';
import { Search, Plus, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Exercises() {
  const { showToast } = useToast();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customForm, setCustomForm] = useState({
    name: '',
    muscle_group: 'Chest',
    secondary_muscles: '',
    category: 'compound',
    equipment: 'barbell',
    instructions: '',
  });

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Cardio'];

  const loadExercises = async () => {
    try {
      const data = await api('/exercises');
      setExercises(data || []);
    } catch (err) {
      console.error('Failed to load exercises', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const handleCreateCustom = async (e) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;

    try {
      await api('/exercises', {
        method: 'POST',
        body: {
          name: customForm.name.trim(),
          muscle_group: customForm.muscle_group,
          secondary_muscles: customForm.secondary_muscles || null,
          category: customForm.category,
          equipment: customForm.equipment,
          instructions: customForm.instructions || 'Custom exercise instructions',
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast(`Added custom exercise: ${customForm.name}!`, 'success');
      setIsModalOpen(false);
      setCustomForm({
        name: '',
        muscle_group: 'Chest',
        secondary_muscles: '',
        category: 'compound',
        equipment: 'barbell',
        instructions: '',
      });
      loadExercises();
    } catch (err) {
      showToast('Error creating exercise: ' + err.message, 'error');
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesMuscle =
      filter === 'All' ||
      ex.muscle_group.toLowerCase() === filter.toLowerCase() ||
      (filter === 'Arms' && (ex.muscle_group === 'Biceps' || ex.muscle_group === 'Triceps'));
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(search.toLowerCase()));
    return matchesMuscle && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Dumbbell className="text-[#EF4444]" size={32} /> Movement Library
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Browse 80+ movements with biomechanical cues, equipment, and form notes.</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Add Movement
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#EF4444]" size={18} />
          <input
            type="text"
            placeholder="Search exercises by name, muscle, or equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#121212] border border-[#262626] rounded-2xl py-3.5 pl-12 pr-4 text-xs text-white focus:border-[#EF4444] outline-none shadow-md placeholder-[#525252]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {muscleGroups.map(m => (
            <button
              key={m}
              onClick={() => {
                triggerHaptic(HapticType.LIGHT);
                setFilter(m);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === m
                  ? 'bg-[#EF4444] text-white'
                  : 'bg-[#121212] border border-[#262626] text-[#A3A3A3] hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3">
          <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs uppercase tracking-wider font-bold">Accessing library...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map(ex => {
            const isExpanded = expandedId === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => {
                  triggerHaptic(HapticType.LIGHT);
                  setExpandedId(isExpanded ? null : ex.id);
                }}
                className="bg-[#121212] border border-[#262626] hover:border-[#EF4444] rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-sm text-white">{ex.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black border border-[#262626] text-[#A3A3A3]">
                      {ex.category}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#A3A3A3] mb-2">
                    <span className="font-black text-[#EF4444]">{ex.muscle_group}</span>
                    <span>•</span>
                    <span className="capitalize">{ex.equipment}</span>
                    {ex.is_custom === 1 && (
                      <>
                        <span>•</span>
                        <span className="text-white font-black text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#EF4444]/20 border border-[#EF4444]/40">
                          CUSTOM
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-3 pt-3 border-t border-[#262626] text-xs text-[#A3A3A3] space-y-1.5 animate-fade-in-up">
                    {ex.secondary_muscles && (
                      <div>
                        <span className="font-bold text-white">Secondary:</span> {ex.secondary_muscles}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-white">Execution Cue:</span> {ex.instructions || 'Controlled eccentric tempo with explosive concentric drive.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#737373] flex items-center justify-end gap-1 mt-1 font-bold">
                    <span>Details</span> <ChevronDown size={12} className="text-[#EF4444]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Movement"
      >
        <form onSubmit={handleCreateCustom} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Movement Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Incline Smith Press"
              value={customForm.name}
              onChange={e => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                Target Muscle
              </label>
              <select
                value={customForm.muscle_group}
                onChange={e => setCustomForm(prev => ({ ...prev, muscle_group: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              >
                {muscleGroups.filter(m => m !== 'All').map(m => (
                  <option key={m} value={m} className="bg-black text-white">{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                Equipment
              </label>
              <select
                value={customForm.equipment}
                onChange={e => setCustomForm(prev => ({ ...prev, equipment: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              >
                <option value="barbell" className="bg-black text-white">Barbell</option>
                <option value="dumbbell" className="bg-black text-white">Dumbbell</option>
                <option value="cable" className="bg-black text-white">Cable</option>
                <option value="machine" className="bg-black text-white">Machine</option>
                <option value="bodyweight" className="bg-black text-white">Bodyweight</option>
                <option value="kettlebell" className="bg-black text-white">Kettlebell</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Cues & Form Instructions
            </label>
            <textarea
              rows="2"
              placeholder="Key cues, setup, and safety tips"
              value={customForm.instructions}
              onChange={e => setCustomForm(prev => ({ ...prev, instructions: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-[#A3A3A3] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              Save Movement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
