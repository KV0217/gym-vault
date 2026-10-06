import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Trophy, ArrowLeft, Trash2, Dumbbell, Check } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const data = await api(`/workouts/${id}`);
        setWorkout(data);
      } catch (err) {
        console.error('Failed to fetch workout details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleDelete = async () => {
    triggerHaptic(HapticType.HEAVY);
    if (!window.confirm('Delete this workout permanently?')) return;
    try {
      await api(`/workouts/${id}`, { method: 'DELETE' });
      showToast('Workout deleted', 'info');
      navigate('/workouts');
    } catch (err) {
      showToast('Error deleting: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3 select-none">
        <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs uppercase tracking-wider font-bold">Loading session log...</div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-20 text-[#A3A3A3] select-none">
        <p className="text-lg">Workout not found.</p>
        <button
          onClick={() => navigate('/workouts')}
          className="mt-4 text-[#EF4444] underline font-bold cursor-pointer"
        >
          Return to History
        </button>
      </div>
    );
  }

  let totalVolume = 0;
  let prCount = 0;
  (workout.exercises || []).forEach(ex => {
    (ex.sets || []).forEach(s => {
      totalVolume += (s.weight_kg || 0) * (s.reps || 0);
      if (s.is_pr) prCount++;
    });
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none">
      <button
        onClick={() => {
          triggerHaptic(HapticType.LIGHT);
          navigate('/workouts');
        }}
        className="flex items-center gap-2 text-[#A3A3A3] hover:text-white transition-colors text-sm font-bold cursor-pointer"
      >
        <ArrowLeft size={16} className="text-[#EF4444]" /> Back to Workouts
      </button>

      {/* Header Card */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-4 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight break-words">{workout.name}</h1>
              {prCount > 0 && (
                <span className="flex items-center gap-1 bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 px-3 py-1 rounded-full text-xs font-black">
                  <Trophy size={13} /> {prCount} PR{prCount > 1 ? 's' : ''}!
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#A3A3A3]">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#EF4444]" /> {workout.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#EF4444]" /> {workout.duration_min || 45} mins
              </span>
              <span>•</span>
              <span className="text-white font-black">
                {Math.round(totalVolume)} kg total volume
              </span>
            </div>
            {workout.notes && (
              <p className="text-xs text-[#A3A3A3] mt-3 italic bg-[#0D0D0D] p-3 rounded-2xl border border-[#262626] inline-block">
                "{workout.notes}"
              </p>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="self-start md:self-auto text-[#EF4444] hover:bg-[#EF4444]/15 border border-[#EF4444]/30 px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} /> Delete Log
          </button>
        </div>
      </div>

      {/* Exercises & Sets */}
      <div className="space-y-4">
        {(workout.exercises || []).map((ex, i) => (
          <div
            key={ex.id || i}
            className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-md"
          >
            <div className="p-4 sm:p-5 bg-[#0D0D0D] border-b border-[#262626] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-black border border-[#262626] text-[#EF4444] text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-extrabold text-base text-white">{ex.exercise_name || ex.name}</h3>
              </div>
              <span className="text-[10px] font-black text-[#A3A3A3] bg-black border border-[#262626] px-2.5 py-0.5 rounded-full uppercase">
                {ex.muscle_group || 'Target'}
              </span>
            </div>

            <div className="p-3 sm:p-5">
              <div className="space-y-1.5">
                <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,0.85fr)_3.5rem] sm:grid-cols-12 gap-1.5 sm:gap-2 text-[10px] font-black text-[#A3A3A3] uppercase tracking-wider px-1 sm:px-2 pb-1">
                  <div className="sm:col-span-2">SET</div>
                  <div className="sm:col-span-4 text-center">KG</div>
                  <div className="sm:col-span-3 text-center">REPS</div>
                  <div className="sm:col-span-3 text-center">STATUS</div>
                </div>

                {(ex.sets || []).map((set, sIdx) => (
                  <div
                    key={set.id || sIdx}
                    className={`grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,0.85fr)_3.5rem] sm:grid-cols-12 gap-1.5 sm:gap-2 items-center p-2 sm:p-2.5 rounded-2xl text-xs font-bold ${
                      set.is_pr
                        ? 'bg-[#EF4444]/15 border border-[#EF4444]/40'
                        : 'bg-[#0D0D0D] border border-[#262626]'
                    }`}
                  >
                    <div className="sm:col-span-2 text-[#A3A3A3] pl-0.5 sm:pl-1 flex items-center gap-1.5 min-w-0">
                      <span className="whitespace-nowrap">#{set.set_number || sIdx + 1}</span>
                    </div>

                    <div className="sm:col-span-4 text-center text-white text-xs sm:text-sm font-black whitespace-nowrap">
                      {set.weight_kg} kg
                    </div>

                    <div className="sm:col-span-3 text-center text-white text-xs sm:text-sm font-black whitespace-nowrap">
                      {set.reps} reps
                    </div>

                    <div className="sm:col-span-3 flex justify-center items-center gap-1">
                      {set.is_pr ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#EF4444] font-black uppercase tracking-wider">
                          <Trophy size={12} /> PR
                        </span>
                      ) : (
                        <span className="text-white flex items-center gap-0.5 text-xs font-bold">
                          <Check size={14} className="text-[#EF4444]" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
