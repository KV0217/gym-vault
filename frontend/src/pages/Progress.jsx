import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Plus, Dumbbell, Scale } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Progress() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('strength');
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(1);
  const [strengthHistory, setStrengthHistory] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);

  const [metricForm, setMetricForm] = useState({
    weight_kg: '',
    body_fat_pct: '',
    chest_cm: '',
    waist_cm: '',
    biceps_cm: '',
    thighs_cm: '',
    notes: '',
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const [exList, bMetrics, vol] = await Promise.all([
          api('/exercises'),
          api('/body-metrics'),
          api('/progress/volume-weekly'),
        ]);
        setExercises(exList || []);
        if (exList && exList.length > 0) {
          setSelectedExerciseId(exList[0].id);
        }
        setBodyMetrics(bMetrics || []);
        setVolumeData(vol || []);
      } catch (err) {
        console.error('Failed to load initial progress data', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function loadStrength() {
      if (!selectedExerciseId) return;
      try {
        const data = await api(`/progress/exercise/${selectedExerciseId}`);
        setStrengthHistory(data || []);
      } catch (err) {
        console.error('Failed to load exercise progress', err);
      }
    }
    loadStrength();
  }, [selectedExerciseId]);

  const handleMetricSubmit = async (e) => {
    e.preventDefault();
    if (!metricForm.weight_kg) {
      showToast('Please enter your body weight', 'error');
      return;
    }
    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        weight_kg: parseFloat(metricForm.weight_kg),
        body_fat_pct: metricForm.body_fat_pct ? parseFloat(metricForm.body_fat_pct) : null,
        chest_cm: metricForm.chest_cm ? parseFloat(metricForm.chest_cm) : null,
        waist_cm: metricForm.waist_cm ? parseFloat(metricForm.waist_cm) : null,
        biceps_cm: metricForm.biceps_cm ? parseFloat(metricForm.biceps_cm) : null,
        thighs_cm: metricForm.thighs_cm ? parseFloat(metricForm.thighs_cm) : null,
        notes: metricForm.notes || 'Routine check-in',
      };
      await api('/body-metrics', { method: 'POST', body: payload });
      triggerHaptic(HapticType.SUCCESS);
      showToast('Body metrics recorded!', 'success');
      setIsMetricModalOpen(false);
      setMetricForm({ weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', biceps_cm: '', thighs_cm: '', notes: '' });

      const updated = await api('/body-metrics');
      setBodyMetrics(updated || []);
    } catch (err) {
      showToast('Error saving: ' + err.message, 'error');
    }
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.is_pr) {
      return (
        <svg x={cx - 7} y={cy - 7} width={14} height={14} fill="#EF4444" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      );
    }
    return <circle cx={cx} cy={cy} r={3.5} fill="#EF4444" stroke="#000" strokeWidth={2} />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <TrendingUp className="text-[#EF4444]" size={32} /> Performance Analytics
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Visualize overload trajectories, body composition, and cumulative volume.</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(HapticType.LIGHT);
            setIsMetricModalOpen(true);
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Record Check-In
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#121212] p-1.5 rounded-2xl border border-[#262626] w-full sm:w-max shadow-md">
        {[
          { id: 'strength', label: 'Strength Progression' },
          { id: 'body', label: 'Body Composition' },
          { id: 'volume', label: 'Muscle Volume' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic(HapticType.LIGHT);
              setActiveTab(tab.id);
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#EF4444] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Strength Progression */}
      {activeTab === 'strength' && (
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Max Weight Over Time</h2>
              <p className="text-xs text-[#A3A3A3] mt-0.5">Top weight lifted and calculated 1-rep maximum</p>
            </div>

            <select
              value={selectedExerciseId}
              onChange={e => setSelectedExerciseId(parseInt(e.target.value))}
              className="bg-[#141414] border border-[#262626] text-white font-bold text-xs p-3 rounded-2xl focus:border-[#EF4444] outline-none"
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id} className="bg-black text-white">
                  {ex.name} ({ex.muscle_group})
                </option>
              ))}
            </select>
          </div>

          <div className="h-80 w-full pt-4">
            {strengthHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#737373] text-xs gap-2">
                <Dumbbell size={32} className="opacity-40 text-[#EF4444]" />
                <div>No workout data recorded yet for this movement. Log sets to generate strength charts!</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#525252" axisLine={false} tickLine={false} />
                  <YAxis stroke="#525252" axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#262626', borderRadius: '12px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    name="Max Weight (kg)"
                    dataKey="max_weight"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={<CustomDot />}
                    activeDot={{ r: 6, fill: '#EF4444' }}
                  />
                  <Line
                    type="monotone"
                    name="Estimated 1RM (kg)"
                    dataKey="estimated_1rm"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Body Weight & Measurements */}
      {activeTab === 'body' && (
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-xl">
            <h2 className="text-xl font-black mb-1 text-white uppercase tracking-tight">Body Weight Trajectory (kg)</h2>
            <p className="text-xs text-[#A3A3A3] mb-4">Historical weigh-in records</p>
            <div className="h-72 w-full">
              {bodyMetrics.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#737373] text-xs gap-2">
                  <Scale size={32} className="opacity-40 text-[#EF4444]" />
                  <div>No weigh-ins logged yet. Use the "Record Check-In" button above!</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" axisLine={false} tickLine={false} />
                    <YAxis stroke="#525252" axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#262626', borderRadius: '12px' }}
                    />
                    <Line
                      type="monotone"
                      name="Weight (kg)"
                      dataKey="weight_kg"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#EF4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Measurements Table */}
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 shadow-xl overflow-x-auto">
            <h3 className="font-black text-sm text-white uppercase mb-3">Measurement History</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262626] text-[#A3A3A3]">
                  <th className="py-3">Date</th>
                  <th className="py-3">Weight</th>
                  <th className="py-3">Body Fat %</th>
                  <th className="py-3">Chest</th>
                  <th className="py-3">Waist</th>
                  <th className="py-3">Biceps</th>
                  <th className="py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {bodyMetrics.map((bm, i) => (
                  <tr key={bm.id || i} className="border-b border-[#1F1F1F] hover:bg-[#171717]">
                    <td className="py-3 text-white font-bold">{bm.date}</td>
                    <td className="py-3 text-[#EF4444] font-black">{bm.weight_kg} kg</td>
                    <td className="py-3 text-[#A3A3A3]">{bm.body_fat_pct ? `${bm.body_fat_pct}%` : '--'}</td>
                    <td className="py-3 text-[#A3A3A3]">{bm.chest_cm ? `${bm.chest_cm} cm` : '--'}</td>
                    <td className="py-3 text-[#A3A3A3]">{bm.waist_cm ? `${bm.waist_cm} cm` : '--'}</td>
                    <td className="py-3 text-[#A3A3A3]">{bm.biceps_cm ? `${bm.biceps_cm} cm` : '--'}</td>
                    <td className="py-3 text-[#737373]">{bm.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Volume */}
      {activeTab === 'volume' && (
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-xl">
          <h2 className="text-xl font-black mb-1 text-white uppercase tracking-tight">Weekly Load by Muscle Group</h2>
          <p className="text-xs text-[#A3A3A3] mb-4">Total training workload (kg × reps)</p>
          <div className="h-80 w-full">
            {volumeData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#737373] text-xs gap-2">
                <Dumbbell size={32} className="opacity-40 text-[#EF4444]" />
                <div>No volume logged yet. Complete workouts to see total muscle load!</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="week" stroke="#525252" axisLine={false} tickLine={false} />
                  <YAxis stroke="#525252" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#262626', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="Chest" fill="#EF4444" stackId="a" />
                  <Bar dataKey="Back" fill="#FFFFFF" stackId="a" />
                  <Bar dataKey="Legs" fill="#A3A3A3" stackId="a" />
                  <Bar dataKey="Shoulders" fill="#525252" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      <Modal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        title="Check-In Body Metrics"
      >
        <form onSubmit={handleMetricSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="75.5"
                value={metricForm.weight_kg}
                onChange={e => setMetricForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                placeholder="15.0"
                value={metricForm.body_fat_pct}
                onChange={e => setMetricForm(prev => ({ ...prev, body_fat_pct: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="100"
                value={metricForm.chest_cm}
                onChange={e => setMetricForm(prev => ({ ...prev, chest_cm: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="82"
                value={metricForm.waist_cm}
                onChange={e => setMetricForm(prev => ({ ...prev, waist_cm: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Biceps (cm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="38"
                value={metricForm.biceps_cm}
                onChange={e => setMetricForm(prev => ({ ...prev, biceps_cm: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Thighs (cm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="58"
                value={metricForm.thighs_cm}
                onChange={e => setMetricForm(prev => ({ ...prev, thighs_cm: e.target.value }))}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Morning fasting check-in"
              value={metricForm.notes}
              onChange={e => setMetricForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsMetricModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-[#A3A3A3] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              Save Metrics
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
