import React, { useState, useEffect } from 'react';
import { Moon, Star, Clock, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Sleep() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ avg_duration: 0, avg_quality: 0, total_logs: 0 });

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '23:00',
    wake_time: '07:00',
    duration_hours: '8.0',
    quality: 4,
    notes: '',
  });

  const loadSleepData = async () => {
    try {
      const [lData, sData] = await Promise.all([
        api('/sleep'),
        api('/sleep/stats'),
      ]);
      setLogs(lData || []);
      setStats(sData || { avg_duration: 0, avg_quality: 0, total_logs: 0 });
    } catch (err) {
      console.error('Failed to load sleep data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSleepData();
  }, []);

  const handleDurationCalc = (bed, wake) => {
    if (!bed || !wake) return;
    const [bH, bM] = bed.split(':').map(Number);
    const [wH, wM] = wake.split(':').map(Number);
    let diffMins = (wH * 60 + wM) - (bH * 60 + bM);
    if (diffMins <= 0) diffMins += 24 * 60;
    const hrs = Math.round((diffMins / 60) * 10) / 10;
    setForm(prev => ({ ...prev, duration_hours: hrs.toString() }));
  };

  const handleCreateSleep = async (e) => {
    e.preventDefault();
    try {
      await api('/sleep', {
        method: 'POST',
        body: {
          date: form.date,
          bedtime: form.bedtime,
          wake_time: form.wake_time,
          duration_hours: parseFloat(form.duration_hours) || 8.0,
          quality: parseInt(form.quality) || 4,
          notes: form.notes || null,
        },
      });

      triggerHaptic(HapticType.SUCCESS);
      showToast('Sleep logged successfully! 😴', 'success');
      setIsModalOpen(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        bedtime: '23:00',
        wake_time: '07:00',
        duration_hours: '8.0',
        quality: 4,
        notes: '',
      });
      loadSleepData();
    } catch (err) {
      showToast('Error logging sleep: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    triggerHaptic(HapticType.HEAVY);
    if (!window.confirm('Delete this sleep log?')) return;
    try {
      await api(`/sleep/${id}`, { method: 'DELETE' });
      showToast('Sleep entry deleted', 'info');
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const chartData = [...logs].reverse().slice(-14).map(l => ({
    date: l.date.slice(5),
    duration: l.duration_hours,
    quality: l.quality,
  }));

  const lastNight = logs[0]?.duration_hours ? `${logs[0].duration_hours} hrs` : '--';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <Moon className="text-[#EF4444]" size={32} /> Sleep & Recovery
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Track duration, circadian patterns, and central nervous system recovery.</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Log Sleep
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Clock}
          label="Average Duration"
          value={stats.avg_duration ? `${stats.avg_duration.toFixed(1)} hrs` : '--'}
          iconColor="text-[#EF4444]"
        />
        <StatCard
          icon={Star}
          label="Average Quality"
          value={stats.avg_quality ? `${stats.avg_quality.toFixed(1)} / 5.0` : '--'}
          iconColor="text-[#EF4444]"
        />
        <StatCard
          icon={Moon}
          label="Last Night's Sleep"
          value={lastNight}
          iconColor="text-[#EF4444]"
        />
      </div>

      {/* Chart */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Sleep Duration (Last 14 Logs)</h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">Recorded nightly hours</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#737373] text-xs gap-2">
              <Moon size={32} className="opacity-40 text-[#EF4444]" />
              <div>No sleep records logged yet. Log last night's sleep to start tracking!</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" stroke="#525252" axisLine={false} tickLine={false} />
                <YAxis stroke="#525252" axisLine={false} tickLine={false} domain={[0, 12]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#262626', borderRadius: '12px' }}
                />
                <Bar dataKey="duration" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 shadow-xl">
        <h3 className="font-black text-base text-white uppercase tracking-tight mb-4">Sleep Log History</h3>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#737373]">No sleep logs recorded.</div>
        ) : (
          <div className="space-y-2.5">
            {logs.map(log => (
              <div
                key={log.id}
                className="p-4 bg-[#0D0D0D] rounded-2xl border border-[#262626] flex justify-between items-center text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.date}</span>
                    <span className="text-[#737373]">
                      ({log.bedtime || '23:00'} → {log.wake_time || '07:00'})
                    </span>
                    <span className="font-black text-[#EF4444]">{log.duration_hours} hrs</span>
                  </div>
                  {log.notes && <div className="text-[11px] text-[#A3A3A3] mt-0.5 italic">"{log.notes}"</div>}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 text-[#EF4444]">
                    {[...Array(log.quality || 4)].map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Sleep Session"
      >
        <form onSubmit={handleCreateSleep} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Bedtime</label>
              <input
                type="time"
                value={form.bedtime}
                onChange={e => {
                  setForm(prev => ({ ...prev, bedtime: e.target.value }));
                  handleDurationCalc(e.target.value, form.wake_time);
                }}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Wake Time</label>
              <input
                type="time"
                value={form.wake_time}
                onChange={e => {
                  setForm(prev => ({ ...prev, wake_time: e.target.value }));
                  handleDurationCalc(form.bedtime, e.target.value);
                }}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Duration (Hours)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="24"
                required
                value={form.duration_hours}
                onChange={e => setForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white font-bold focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Quality Rating</label>
              <select
                value={form.quality}
                onChange={e => setForm(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white font-bold focus:border-[#EF4444] outline-none"
              >
                <option value="5" className="bg-black text-white">5 Stars - Fully Recovered</option>
                <option value="4" className="bg-black text-white">4 Stars - Good Sleep</option>
                <option value="3" className="bg-black text-white">3 Stars - Average</option>
                <option value="2" className="bg-black text-white">2 Stars - Interrupted</option>
                <option value="1" className="bg-black text-white">1 Star - Poor / Exhausted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Notes</label>
            <input
              type="text"
              placeholder="e.g. Magnesium taken, felt energetic"
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
              Save Sleep
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
