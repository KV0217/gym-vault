import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, Check, Clock, Save, X, Search, Trophy, Play, Pause, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function NewWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [name, setName] = useState('Workout Session');
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [exercises, setExercises] = useState([]);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [submitting, setSubmitting] = useState(false);

  // Load available exercises from backend
  useEffect(() => {
    async function loadExercises() {
      try {
        const data = await api('/exercises');
        setAvailableExercises(data || []);
      } catch (err) {
        console.error('Failed to load exercises', err);
      }
    }
    loadExercises();
  }, []);

  // Pre-fill from template or AI coach suggestion if passed in location.state
  useEffect(() => {
    if (location.state?.templateName) {
      setName(location.state.templateName);
    }
    if (location.state?.suggestedExercises && location.state.suggestedExercises.length > 0) {
      const prefilled = location.state.suggestedExercises.map((sEx, i) => {
        const setsCount = sEx.suggested_sets || 3;
        const defaultWeight = sEx.suggested_weight_kg || 0;
        const defaultReps = sEx.suggested_reps || 10;
        const sets = [];
        for (let s = 1; s <= setsCount; s++) {
          sets.push({
            id: `set-${i}-${s}-${Date.now()}`,
            weight: defaultWeight > 0 ? defaultWeight.toString() : '',
            reps: defaultReps.toString(),
            rpe: '8',
            completed: false,
          });
        }
        return {
          id: sEx.exercise_id || sEx.id,
          instanceId: `inst-${i}-${Date.now()}`,
          name: sEx.name,
          muscle: sEx.muscle_group || 'Chest',
          sets,
        };
      });
      setExercises(prefilled);
    }
  }, [location.state]);

  // Workout stopwatch
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, isTimerRunning]);

  // Rest timer countdown
  useEffect(() => {
    let interval;
    if (isRestModalOpen && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            setIsRestModalOpen(false);
            triggerHaptic(HapticType.REST_END);
            showToast('Rest timer finished! Time for your next set! 🔔', 'achievement');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRestModalOpen, restTimeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRest = (seconds = 90) => {
    triggerHaptic(HapticType.LIGHT);
    setRestTimeLeft(seconds);
    setIsRestModalOpen(true);
  };

  const addExercise = (ex) => {
    triggerHaptic(HapticType.LIGHT);
    const newEx = {
      id: ex.id,
      instanceId: `inst-${Date.now()}`,
      name: ex.name,
      muscle: ex.muscle_group,
      sets: [
        {
          id: `set-${Date.now()}-1`,
          weight: '',
          reps: '10',
          rpe: '8',
          completed: false,
        },
      ],
    };
    setExercises(prev => [...prev, newEx]);
    setIsExerciseModalOpen(false);
  };

  const addSet = (instanceId) => {
    triggerHaptic(HapticType.LIGHT);
    setExercises(prev =>
      prev.map(ex => {
        if (ex.instanceId === instanceId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: `set-${Date.now()}-${ex.sets.length + 1}`,
                weight: lastSet ? lastSet.weight : '',
                reps: lastSet ? lastSet.reps : '10',
                rpe: lastSet ? lastSet.rpe : '8',
                completed: false,
              },
            ],
          };
        }
        return ex;
      })
    );
  };

  const updateSet = (instanceId, setId, field, value) => {
    setExercises(prev =>
      prev.map(ex => {
        if (ex.instanceId === instanceId) {
          return {
            ...ex,
            sets: ex.sets.map(s => (s.id === setId ? { ...s, [field]: value } : s)),
          };
        }
        return ex;
      })
    );
  };

  const toggleSetComplete = (instanceId, setId) => {
    setExercises(prev =>
      prev.map(ex => {
        if (ex.instanceId === instanceId) {
          return {
            ...ex,
            sets: ex.sets.map(s => {
              if (s.id === setId) {
                const nowComplete = !s.completed;
                if (nowComplete) {
                  triggerHaptic(HapticType.SUCCESS);
                  startRest(90);
                } else {
                  triggerHaptic(HapticType.LIGHT);
                }
                return { ...s, completed: nowComplete };
              }
              return s;
            }),
          };
        }
        return ex;
      })
    );
  };

  const removeSet = (instanceId, setId) => {
    triggerHaptic(HapticType.LIGHT);
    setExercises(prev =>
      prev.map(ex => {
        if (ex.instanceId === instanceId) {
          return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
        }
        return ex;
      })
    );
  };

  const removeExercise = (instanceId) => {
    triggerHaptic(HapticType.LIGHT);
    setExercises(prev => prev.filter(ex => ex.instanceId !== instanceId));
  };

  const finishWorkout = async () => {
    if (exercises.length === 0) {
      showToast('Please add at least one exercise to your workout!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const durationMin = Math.max(1, Math.round(elapsed / 60));

      const session = await api('/workouts', {
        method: 'POST',
        body: {
          name: name.trim() || 'Workout Session',
          date: new Date().toISOString().split('T')[0],
          duration_min: durationMin,
        },
      });

      const sessionId = session.id;
      let prCount = 0;

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const exLog = await api(`/workouts/${sessionId}/exercises`, {
          method: 'POST',
          body: {
            exercise_id: ex.id,
            order_index: i,
          },
        });

        const exLogId = exLog.id;

        for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
          const s = ex.sets[sIdx];
          const setRes = await api(`/workouts/exercise-logs/${exLogId}/sets`, {
            method: 'POST',
            body: {
              set_number: sIdx + 1,
              weight_kg: parseFloat(s.weight) || 0,
              reps: parseInt(s.reps) || 0,
              rpe: parseInt(s.rpe) || null,
              completed: s.completed ? 1 : 1,
            },
          });
          if (setRes.is_pr) prCount++;
        }
      }

      await api(`/workouts/${sessionId}`, {
        method: 'PUT',
        body: { completed: 1, duration_min: durationMin },
      });

      if (prCount > 0) {
        triggerHaptic(HapticType.PR);
        showToast(`Incredible! You hit ${prCount} new Personal Record(s)! 🏆`, 'achievement');
      } else {
        triggerHaptic(HapticType.SUCCESS);
        showToast('Workout logged successfully!', 'success');
      }

      navigate(`/workouts/${sessionId}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save workout: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const muscleList = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Cardio'];
  const filteredAvailable = availableExercises.filter(ex => {
    const matchMuscle = selectedMuscle === 'All' || ex.muscle_group === selectedMuscle;
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchMuscle && matchSearch;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 max-w-4xl mx-auto select-none min-w-0">
      {/* Sticky Workout Control Bar */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-4 sm:p-6 md:sticky md:top-4 z-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full sm:w-auto text-xl sm:text-2xl font-black bg-transparent border-b border-transparent focus:border-[#EF4444] outline-none text-white transition-all px-1"
          />
          <div className="flex items-center gap-3 text-sm mt-1 px-1">
            <div className="flex items-center gap-1.5 text-[#EF4444] font-bold font-mono">
              <Clock size={16} className="text-[#EF4444]" />
              <span>{formatTime(elapsed)}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-xs text-[#A3A3A3] hover:text-white font-bold transition-all cursor-pointer"
            >
              {isTimerRunning ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => startRest(90)}
            className="bg-[#171717] border border-[#262626] hover:border-[#EF4444] text-white px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Clock size={14} className="text-[#EF4444]" /> Rest Timer
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={finishWorkout}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2.5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 cursor-pointer text-sm"
          >
            <Save size={18} /> {submitting ? 'Saving...' : 'Finish Workout'}
          </button>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-5">
        {exercises.map((ex) => (
          <div
            key={ex.instanceId}
            className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-md"
          >
            <div className="p-4 sm:p-5 bg-[#0D0D0D] border-b border-[#262626] flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-white">{ex.name}</h3>
                <span className="text-[10px] font-black text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {ex.muscle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(ex.instanceId)}
                className="text-[#737373] hover:text-[#EF4444] p-1.5 transition-colors rounded-xl hover:bg-[#EF4444]/10 cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-5">
              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,0.9fr)_2.75rem] sm:grid-cols-12 gap-1.5 sm:gap-2 text-[11px] font-black text-[#A3A3A3] uppercase tracking-wider px-2">
                  <div className="sm:col-span-2">SET</div>
                  <div className="sm:col-span-4">KG</div>
                  <div className="sm:col-span-3">REPS</div>
                  <div className="sm:col-span-3 text-center">DONE</div>
                </div>

                {ex.sets.map((s, sIndex) => (
                  <div
                    key={s.id}
                    className={`grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,0.9fr)_2.75rem] sm:grid-cols-12 gap-1.5 sm:gap-2 items-center p-1.5 sm:p-2 rounded-2xl transition-all ${
                      s.completed
                        ? 'bg-[#EF4444]/15 border border-[#EF4444]/40'
                        : 'bg-[#0D0D0D] border border-[#262626]'
                    }`}
                  >
                    <div className="sm:col-span-2 font-bold text-sm text-[#A3A3A3] flex items-center gap-1 min-w-0">
                      <span>{sIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSet(ex.instanceId, s.id)}
                        className="text-[#525252] hover:text-[#EF4444] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="sm:col-span-4 min-w-0">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="kg"
                        value={s.weight}
                        onChange={e => updateSet(ex.instanceId, s.id, 'weight', e.target.value)}
                        className="w-full bg-[#141414] border border-[#262626] rounded-xl p-2 text-center text-sm font-bold text-white focus:border-[#EF4444] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3 min-w-0">
                      <input
                        type="number"
                        placeholder="reps"
                        value={s.reps}
                        onChange={e => updateSet(ex.instanceId, s.id, 'reps', e.target.value)}
                        className="w-full bg-[#141414] border border-[#262626] rounded-xl p-2 text-center text-sm font-bold text-white focus:border-[#EF4444] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3 flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleSetComplete(ex.instanceId, s.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          s.completed
                            ? 'bg-[#EF4444] text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                            : 'bg-[#141414] border border-[#262626] text-[#737373] hover:border-[#EF4444]'
                        }`}
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSet(ex.instanceId)}
                className="w-full mt-3 py-2.5 rounded-2xl border border-dashed border-[#262626] hover:border-[#EF4444] text-xs font-bold text-[#A3A3A3] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-[#EF4444]" /> Add Set
              </button>
            </div>
          </div>
        ))}

        {/* Add Exercise CTA */}
        <button
          type="button"
          onClick={() => setIsExerciseModalOpen(true)}
          className="w-full py-5 rounded-3xl bg-[#121212] border-2 border-dashed border-[#262626] hover:border-[#EF4444] text-white font-black transition-all flex items-center justify-center gap-2 hover:bg-[#1A1A1A] cursor-pointer"
        >
          <Plus size={20} className="text-[#EF4444]" /> Add Exercise to Workout
        </button>
      </div>

      {/* Exercise Picker Modal */}
      <Modal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        title="Select Movement"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#EF4444]" size={18} />
            <input
              type="text"
              placeholder="Search exercise library..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-2xl py-3 pl-11 pr-4 text-sm text-white focus:border-[#EF4444] outline-none"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {muscleList.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMuscle(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedMuscle === m
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {filteredAvailable.map(ex => (
              <div
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="p-3.5 bg-[#0D0D0D] hover:bg-[#171717] border border-[#262626] hover:border-[#EF4444] rounded-2xl cursor-pointer transition-all flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-sm text-white">{ex.name}</div>
                  <div className="text-[10px] text-[#737373] flex items-center gap-2 mt-0.5">
                    <span>{ex.muscle_group}</span>
                    <span>•</span>
                    <span className="capitalize">{ex.equipment}</span>
                  </div>
                </div>
                <Plus size={16} className="text-[#EF4444]" />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Floating Rest Timer Modal */}
      {isRestModalOpen && (
        <div
          className="fixed z-50 bg-[#0D0D0D] border-2 border-[#EF4444] p-4 sm:p-5 rounded-3xl shadow-2xl animate-fade-in-up glow-red w-[calc(100vw-2rem)] max-w-72 sm:w-72"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))', right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-[#EF4444] uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-[#EF4444]" /> REST TIMER
            </span>
            <button
              onClick={() => setIsRestModalOpen(false)}
              className="text-[#737373] hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="text-4xl font-black font-mono text-center text-white py-2">
            {formatTime(restTimeLeft)}
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[30, 60, 90, 120].map(sec => (
              <button
                key={sec}
                onClick={() => setRestTimeLeft(sec)}
                className="py-1.5 rounded-xl bg-[#141414] border border-[#262626] hover:border-[#EF4444] text-[10px] font-bold text-white cursor-pointer"
              >
                +{sec}s
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
