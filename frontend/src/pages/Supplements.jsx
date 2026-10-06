import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Supplements() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplements, setSupplements] = useState([]);
  const [form, setForm] = useState({
    name: '',
    dosage: '5g',
    time_taken: 'morning',
  });

  const loadSupplements = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api(`/supplements?date=${today}`);
      setSupplements(data || []);
    } catch (err) {
      console.error('Failed to load supplements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplements();
  }, []);

  const handleAddSupplement = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await api('/supplements', {
        method: 'POST',
        body: {
          date: today,
          name: form.name.trim(),
          dosage: form.dosage.trim(),
          time_taken: form.time_taken,
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast(`Logged ${form.name}! 💊`, 'success');
      setIsModalOpen(false);
      setForm({ name: '', dosage: '5g', time_taken: 'morning' });
      loadSupplements();
    } catch (err) {
      showToast('Error logging supplement: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    triggerHaptic(HapticType.HEAVY);
    try {
      await api(`/supplements/${id}`, { method: 'DELETE' });
      showToast('Removed entry', 'info');
      setSupplements(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      showToast('Error removing: ' + err.message, 'error');
    }
  };

  const handleQuickLog = async (name, dosage, time_taken) => {
    triggerHaptic(HapticType.LIGHT);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api('/supplements', {
        method: 'POST',
        body: { date: today, name, dosage, time_taken },
      });
      showToast(`Logged ${name}!`, 'success');
      loadSupplements();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const morningSupps = supplements.filter(s => s.time_taken === 'morning');
  const eveningSupps = supplements.filter(s => s.time_taken === 'evening' || s.time_taken === 'post_workout');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Pill className="text-[#EF4444]" size={32} /> Supplement Protocol
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Track creatine, whey protein, vitamins, and ergogenic aids.</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Log Supplement
        </button>
      </div>

      {/* Quick Add Suggestions */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 sm:p-6 shadow-lg">
        <h3 className="text-xs font-black text-[#A3A3A3] uppercase tracking-wider mb-3">Daily Essentials</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Creatine Monohydrate', dosage: '5g', time: 'morning' },
            { name: 'Whey Isolate', dosage: '1 scoop (30g)', time: 'post_workout' },
            { name: 'Omega-3 Fish Oil', dosage: '2 softgels', time: 'morning' },
            { name: 'Vitamin D3 + K2', dosage: '5000 IU', time: 'morning' },
            { name: 'Magnesium Glycinate', dosage: '400mg', time: 'evening' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickLog(item.name, item.dosage, item.time)}
              className="bg-[#171717] hover:bg-[#222222] border border-[#262626] hover:border-[#EF4444] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} className="text-[#EF4444]" /> {item.name} ({item.dosage})
            </button>
          ))}
        </div>
      </div>

      {/* Routine Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Morning Stack */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#0D0D0D] p-5 border-b border-[#262626] flex justify-between items-center">
            <h2 className="font-black text-sm text-white uppercase flex items-center gap-2">
              <Clock size={16} className="text-[#EF4444]" /> Morning & Pre-Workout
            </h2>
            <span className="text-[10px] text-[#A3A3A3] font-bold">{morningSupps.length} logged today</span>
          </div>

          <div className="p-5">
            {morningSupps.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#737373]">No morning supplements logged today.</div>
            ) : (
              <div className="space-y-2">
                {morningSupps.map(s => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-[#0D0D0D] rounded-2xl border border-[#262626] flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-[#EF4444]" />
                      <div>
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{s.dosage}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Evening / Post-Workout Stack */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#0D0D0D] p-5 border-b border-[#262626] flex justify-between items-center">
            <h2 className="font-black text-sm text-white uppercase flex items-center gap-2">
              <Clock size={16} className="text-[#EF4444]" /> Post-Workout & Evening
            </h2>
            <span className="text-[10px] text-[#A3A3A3] font-bold">{eveningSupps.length} logged today</span>
          </div>

          <div className="p-5">
            {eveningSupps.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#737373]">No evening supplements logged today.</div>
            ) : (
              <div className="space-y-2">
                {eveningSupps.map(s => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-[#0D0D0D] rounded-2xl border border-[#262626] flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-[#EF4444]" />
                      <div>
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{s.dosage}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Supplement"
      >
        <form onSubmit={handleAddSupplement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Supplement Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Creatine, Whey, Ashwagandha, Zinc"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Dosage</label>
              <input
                type="text"
                placeholder="5g, 1 scoop, 400mg"
                value={form.dosage}
                onChange={e => setForm(prev => ({ ...prev, dosage: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Timing</label>
              <select
                value={form.time_taken}
                onChange={e => setForm(prev => ({ ...prev, time_taken: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
              >
                <option value="morning" className="bg-black text-white">Morning</option>
                <option value="post_workout" className="bg-black text-white">Post-Workout</option>
                <option value="evening" className="bg-black text-white">Evening / Bedtime</option>
              </select>
            </div>
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
              Log Supplement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
