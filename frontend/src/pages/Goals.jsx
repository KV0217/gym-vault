import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Trash2, Award, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Goals() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exercises, setExercises] = useState([]);

  const [form, setForm] = useState({
    title: '',
    type: 'strength',
    target_value: '',
    unit: 'kg',
    exercise_id: '',
    deadline: '',
    notes: '',
  });

  const loadGoals = async () => {
    try {
      await api('/goals/check-auto').catch(() => {});
      const [gData, exData] = await Promise.all([
        api('/goals'),
        api('/exercises'),
      ]);
      setGoals(gData || []);
      setExercises(exData || []);
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.target_value) {
      showToast('Please enter a goal title and target value', 'error');
      return;
    }

    try {
      await api('/goals', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          type: form.type,
          target_value: parseFloat(form.target_value),
          unit: form.unit,
          exercise_id: form.exercise_id ? parseInt(form.exercise_id) : null,
          deadline: form.deadline || null,
          notes: form.notes || null,
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast('New target goal established! 🎯', 'success');
      setIsModalOpen(false);
      setForm({ title: '', type: 'strength', target_value: '', unit: 'kg', exercise_id: '', deadline: '', notes: '' });
      loadGoals();
    } catch (err) {
      showToast('Error creating goal: ' + err.message, 'error');
    }
  };

  const handleUpdateProgress = async (id, currentValue, targetValue) => {
    triggerHaptic(HapticType.LIGHT);
    const val = prompt('Update current progress value:', currentValue);
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;

    try {
      await api(`/goals/${id}/progress`, {
        method: 'PUT',
        body: { current_value: num },
      });
      if (num >= targetValue) {
        triggerHaptic(HapticType.PR);
        showToast('GOAL ACHIEVED! Incredible work! 🏆', 'achievement');
      } else {
        showToast('Progress updated', 'success');
      }
      loadGoals();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    triggerHaptic(HapticType.HEAVY);
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      showToast('Goal deleted', 'info');
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Target className="text-[#EF4444]" size={32} /> Milestones & Goals
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Set strength milestones, body composition targets, and habit metrics.</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={18} /> Add Target
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3">
          <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs uppercase tracking-wider font-bold">Loading goals...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Goals */}
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">Active Targets ({activeGoals.length})</h2>
            {activeGoals.length === 0 ? (
              <div className="bg-[#121212] border border-[#262626] rounded-3xl p-8 text-center text-xs text-[#737373]">
                No active targets right now. Establish a bench press target or body weight milestone!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeGoals.map(goal => {
                  const pct = Math.min(100, Math.round(((goal.current_value || 0) / (goal.target_value || 1)) * 100));
                  return (
                    <div
                      key={goal.id}
                      className="bg-[#121212] border border-[#262626] hover:border-[#EF4444] rounded-3xl p-5 sm:p-6 transition-all shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-extrabold text-base text-white">{goal.title}</h3>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black border border-[#262626] text-[#A3A3A3]">
                            {goal.type}
                          </span>
                        </div>

                        {goal.notes && (
                          <p className="text-xs text-[#A3A3A3] mb-3 italic">"{goal.notes}"</p>
                        )}

                        <div className="my-3">
                          <div className="flex justify-between text-xs mb-1.5 font-bold">
                            <span className="text-[#A3A3A3]">Progress</span>
                            <span className="text-white">
                              {goal.current_value || 0} / {goal.target_value} {goal.unit} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-[#262626]">
                            <div
                              className="h-full bg-[#EF4444] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {goal.deadline && (
                          <div className="text-[11px] text-[#737373] flex items-center gap-1.5 mb-2">
                            <Clock size={12} className="text-[#EF4444]" /> Deadline: {goal.deadline}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#1F1F1F] mt-2">
                        <button
                          onClick={() => handleUpdateProgress(goal.id, goal.current_value, goal.target_value)}
                          className="text-xs font-bold text-white hover:text-[#EF4444] transition-colors cursor-pointer"
                        >
                          Update Progress
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
                <Award size={20} className="text-[#EF4444]" /> Completed Milestones ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completedGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="bg-[#121212] border border-[#EF4444]/40 rounded-3xl p-5 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-base line-through text-[#737373]">
                        {goal.title}
                      </h3>
                      <CheckCircle2 size={20} className="text-[#EF4444]" />
                    </div>
                    <div className="text-xs font-black text-[#EF4444] mt-1">
                      Target Reached: {goal.target_value} {goal.unit} 🏆
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Establish Target Goal"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
              Goal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 100kg Bench Press, 15% Body Fat, 80kg Body Weight"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Goal Type</label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              >
                <option value="strength" className="bg-black text-white">Strength / Lift</option>
                <option value="weight" className="bg-black text-white">Body Weight</option>
                <option value="habit" className="bg-black text-white">Habit / Frequency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Unit</label>
              <input
                type="text"
                placeholder="kg, reps, days"
                value={form.unit}
                onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Target Value *</label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="100"
                value={form.target_value}
                onChange={e => setForm(prev => ({ ...prev, target_value: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Target Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
          </div>

          {form.type === 'strength' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Linked Movement</label>
              <select
                value={form.exercise_id}
                onChange={e => setForm(prev => ({ ...prev, exercise_id: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              >
                <option value="" className="bg-black text-white">Select movement for auto-sync...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id} className="bg-black text-white">
                    {ex.name} ({ex.muscle_group})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Notes</label>
            <input
              type="text"
              placeholder="Target motivation or cues"
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
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
              Set Target
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
