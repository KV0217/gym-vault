import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Calendar, Check } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Templates() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'Hypertrophy',
    exercise_ids: [],
  });

  const loadTemplates = async () => {
    try {
      const [tData, exData] = await Promise.all([
        api('/templates'),
        api('/exercises'),
      ]);
      setTemplates(tData || []);
      setAvailableExercises(exData || []);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const startTemplate = async (templateId, templateName) => {
    triggerHaptic(HapticType.MEDIUM);
    try {
      const session = await api(`/templates/${templateId}/start`, { method: 'POST' });
      showToast(`Started ${templateName}! Log your sets now.`, 'success');
      navigate('/workouts/new', {
        state: {
          sessionId: session.id,
          templateName: session.name,
        },
      });
    } catch (err) {
      showToast('Error starting routine: ' + err.message, 'error');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;

    try {
      const exercisesPayload = newTemplate.exercise_ids.map((id, index) => ({
        exercise_id: id,
        order_index: index,
        default_sets: 3,
        default_reps: 10,
      }));

      await api('/templates', {
        method: 'POST',
        body: {
          name: newTemplate.name.trim(),
          description: newTemplate.description.trim() || 'Custom routine',
          category: newTemplate.category,
          exercises: exercisesPayload,
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast('New template created!', 'success');
      setIsModalOpen(false);
      setNewTemplate({ name: '', description: '', category: 'Hypertrophy', exercise_ids: [] });
      loadTemplates();
    } catch (err) {
      showToast('Error creating template: ' + err.message, 'error');
    }
  };

  const toggleExerciseSelection = (exId) => {
    triggerHaptic(HapticType.LIGHT);
    setNewTemplate(prev => {
      const exists = prev.exercise_ids.includes(exId);
      return {
        ...prev,
        exercise_ids: exists
          ? prev.exercise_ids.filter(id => id !== exId)
          : [...prev.exercise_ids, exId],
      };
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Calendar className="text-[#EF4444]" size={32} /> Workout Routines
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Pre-built training splits and custom program templates.</p>
        </div>
        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
        >
          <Plus size={20} /> Create Routine
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3">
          <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs uppercase tracking-wider font-bold">Loading routines...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden flex flex-col group hover:border-[#EF4444] transition-all shadow-lg"
            >
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-black text-white group-hover:text-white transition-colors">
                      {template.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black border border-[#262626] text-[#EF4444]">
                      {template.category || 'Hypertrophy'}
                    </span>
                  </div>
                  <p className="text-[#A3A3A3] text-xs mb-5 line-clamp-2 leading-relaxed">
                    {template.description || 'Pre-programmed exercise rotation with progressive overload targets.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[#A3A3A3]">
                  <span className="bg-[#0D0D0D] px-3 py-1.5 rounded-xl border border-[#262626]">
                    {template.exercise_count || template.exercises?.length || '6'} Movements
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startTemplate(template.id, template.name)}
                className="w-full bg-[#171717] hover:bg-[#EF4444] text-white hover:text-white font-black py-3.5 transition-all flex items-center justify-center gap-2 border-t border-[#262626] text-sm cursor-pointer"
              >
                <Play size={16} fill="currentColor" className="text-[#EF4444] group-hover:text-white" /> Launch Routine
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Routine"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Routine Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Upper Heavy Strength, Leg Hypertrophy"
              value={newTemplate.name}
              onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-sm text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Description / Target
            </label>
            <input
              type="text"
              placeholder="e.g. Chest and back heavy compounds with arm burnout"
              value={newTemplate.description}
              onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-sm text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Select Movements ({newTemplate.exercise_ids.length} selected)
            </label>
            <div className="max-h-56 overflow-y-auto space-y-1.5 p-1">
              {availableExercises.map(ex => {
                const isSelected = newTemplate.exercise_ids.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    onClick={() => toggleExerciseSelection(ex.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center text-xs ${
                      isSelected
                        ? 'bg-[#171717] border-[#EF4444] text-white shadow-sm'
                        : 'bg-[#0D0D0D] border-[#262626] text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{ex.name}</span>
                      <span className="text-[10px] ml-2 text-[#737373]">({ex.muscle_group})</span>
                    </div>
                    {isSelected && <Check size={14} className="text-[#EF4444]" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              Save Routine
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
