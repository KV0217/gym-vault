import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Dumbbell, Calendar, ChevronRight, Activity, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Workouts() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWorkouts = async () => {
    try {
      const data = await api('/workouts');
      setWorkouts(data || []);
    } catch (err) {
      console.error('Failed to load workouts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    triggerHaptic(HapticType.HEAVY);
    if (!window.confirm('Delete this workout session?')) return;
    try {
      await api(`/workouts/${id}`, { method: 'DELETE' });
      showToast('Workout log deleted', 'info');
      setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 uppercase text-white tracking-tight">
            <Activity className="text-[#EF4444]" size={32} /> Workout History
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Review logged training sessions, volume, and overload records.</p>
        </div>
        <button
          onClick={() => {
            triggerHaptic(HapticType.MEDIUM);
            navigate('/workouts/new');
          }}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
        >
          <Plus size={20} /> Log Workout
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3">
          <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs uppercase tracking-wider font-bold">Loading training sessions...</div>
        </div>
      ) : workouts.length === 0 ? (
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-black border border-[#262626] flex items-center justify-center mx-auto text-[#EF4444]">
            <Dumbbell size={32} />
          </div>
          <h3 className="text-xl font-black text-white uppercase">No workouts logged yet</h3>
          <p className="text-[#A3A3A3] text-sm max-w-md mx-auto">
            Log your sets, record weight and reps, and let the AI progressive overload engine monitor your strength.
          </p>
          <button
            onClick={() => {
              triggerHaptic(HapticType.LIGHT);
              navigate('/workouts/new');
            }}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-2xl font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Start First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map(workout => {
            const workoutDate = workout.date ? workout.date : 'Today';
            return (
              <div
                key={workout.id}
                onClick={() => {
                  triggerHaptic(HapticType.LIGHT);
                  navigate(`/workouts/${workout.id}`);
                }}
                className="bg-[#121212] border border-[#262626] hover:border-[#EF4444] rounded-2xl p-5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black border border-[#262626] flex items-center justify-center text-[#EF4444] group-hover:scale-105 transition-transform shrink-0">
                    <Dumbbell size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-white transition-colors">
                      {workout.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#A3A3A3] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#EF4444]" /> {workoutDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-[#EF4444]" /> {workout.duration_min || 45} min
                      </span>
                      {workout.exercise_count !== undefined && (
                        <>
                          <span>•</span>
                          <span>{workout.exercise_count} Movements</span>
                        </>
                      )}
                      {workout.total_volume > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#EF4444] font-black">
                            {Math.round(workout.total_volume)} kg total
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, workout.id)}
                    className="p-2 text-[#737373] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={20} className="text-[#737373] group-hover:text-[#EF4444] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
