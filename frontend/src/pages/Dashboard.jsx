import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Flame, Calendar, Trophy, Play, Bot, Target, Sparkles, ChevronRight, Dumbbell } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { api } from '../api';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [aiWorkout, setAiWorkout] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, profRes, aiRes, goalsRes] = await Promise.allSettled([
          api('/dashboard'),
          api('/profile'),
          api('/ai/workout-suggestion'),
          api('/goals'),
        ]);

        if (dashRes.status === 'fulfilled') setData(dashRes.value);
        if (profRes.status === 'fulfilled') setProfile(profRes.value);
        if (aiRes.status === 'fulfilled') setAiWorkout(aiRes.value);
        if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleStartAiWorkout = () => {
    triggerHaptic(HapticType.MEDIUM);
    if (aiWorkout && aiWorkout.exercises) {
      navigate('/workouts/new', {
        state: {
          templateName: aiWorkout.workout_name,
          suggestedExercises: aiWorkout.exercises,
        },
      });
    } else {
      navigate('/workouts/new');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#A3A3A3] font-bold text-xs tracking-widest uppercase">
          Loading command center...
        </div>
      </div>
    );
  }

  const name = profile?.name || 'Athlete';
  const targetCals = profile?.daily_calorie_target || profile?.tdee || 2500;
  const targetProtein = profile?.daily_protein_target || Math.round((profile?.weight_kg || 75) * 2);
  const targetCarbs = profile?.daily_carbs_target || Math.round((profile?.weight_kg || 75) * 3.5);
  const targetFat = profile?.daily_fat_target || Math.round((profile?.weight_kg || 75) * 1.0);

  const eatenCals = data?.todayNutrition?.calories || 0;
  const eatenProtein = data?.todayNutrition?.protein || 0;
  const eatenCarbs = data?.todayNutrition?.carbs || 0;
  const eatenFat = data?.todayNutrition?.fat || 0;
  const remainingCals = Math.max(0, targetCals - eatenCals);

  const macroData = [
    { name: 'Protein', value: eatenProtein, color: '#EF4444' },
    { name: 'Carbs', value: eatenCarbs, color: '#FFFFFF' },
    { name: 'Fat', value: eatenFat, color: '#A3A3A3' },
    { name: 'Remaining', value: remainingCals > 0 ? Math.round(remainingCals / 4) : 0, color: '#262626' },
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const activityData = weekDays.map((day, idx) => ({
    name: day,
    workouts: idx === todayIdx && data?.todayWorkout ? 1 : (idx < todayIdx && Math.min(1, data?.weeklyWorkoutCount || 0) ? 1 : 0),
  }));

  const activeGoals = goals.filter(g => !g.completed).slice(0, 3);
  const recentPrs = data?.recentPRs || [];
  const insights = data?.ai_insights?.insights || [
    {
      title: 'AI Progressive Overload',
      message: 'Keep workout intensity consistent this week to hit your volume target.',
      priority: 'high',
    },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Top Athlete Hero Banner */}
      <div className="bg-[#121212] rounded-3xl p-5 sm:p-8 border border-[#262626] relative overflow-hidden group shadow-2xl">
        <div className="w-fit self-start sm:absolute sm:right-6 sm:top-6 mb-3 sm:mb-0 text-[#EF4444] flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30">
          <Sparkles size={14} className="text-[#EF4444]" /> AI OPTIMIZED
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase mb-2 break-words">
          {getGreeting()}, {name}!
        </h1>
        <p className="text-sm text-[#A3A3A3] max-w-xl leading-relaxed">
          Focus: <span className="text-white font-extrabold uppercase">{profile?.goal || 'FITNESS'}</span> • Split:{' '}
          <span className="text-white font-extrabold uppercase">{profile?.preferred_split || 'PPL'}</span> ({profile?.workout_days_per_week || 5} days/week). Ready to crush today's session?
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          icon={Activity}
          label="Workouts This Month"
          value={data?.monthWorkouts ?? 0}
          iconColor="text-[#EF4444]"
        />
        <StatCard
          icon={Calendar}
          label="Workouts This Week"
          value={data?.weeklyWorkoutCount ?? 0}
          iconColor="text-[#EF4444]"
        />
        <StatCard
          icon={Flame}
          label="Active Streak"
          value={`${data?.streak ?? 0} days`}
          iconColor="text-[#EF4444]"
        />
        <StatCard
          icon={Dumbbell}
          label="Current Weight"
          value={`${data?.latestWeightKg ?? profile?.weight_kg ?? '--'} kg`}
          iconColor="text-[#EF4444]"
        />
      </div>

      {/* AI Smart Insights */}
      {insights.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {insights.map((insight, idx) => {
            const isHigh = insight.priority === 'high';
            return (
              <div
                key={idx}
                className="min-w-[min(88vw,310px)] bg-[#121212] border-l-4 border-[#EF4444] border-t border-r border-b border-[#262626] p-4 rounded-2xl shadow-md flex items-start gap-3.5"
              >
                <Bot size={22} className="text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                    {insight.title}
                    {isHigh && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                        PRIORITY
                      </span>
                    )}
                  </h4>
                  <p className="text-[#A3A3A3] text-xs mt-1 leading-relaxed">{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's Workout & Nutrition Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Workout Box */}
        <div className="bg-[#121212] rounded-3xl p-6 sm:p-7 border border-[#262626] col-span-1 lg:col-span-2 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Dumbbell size={22} className="text-[#EF4444]" /> Today's Workout
              </h2>
              <span className="text-xs font-black text-white bg-[#1A1A1A] border border-[#262626] px-3 py-1 rounded-full flex items-center gap-1.5">
                <Bot size={13} className="text-[#EF4444]" /> AI SCHEDULED
              </span>
            </div>

            {aiWorkout ? (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-5 mb-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                  <h3 className="text-2xl font-black text-white">{aiWorkout.workout_name}</h3>
                  <div className="text-xs text-[#A3A3A3] font-bold">
                    ~{aiWorkout.estimated_duration_min || 45} mins • {aiWorkout.total_sets || 18} total sets
                  </div>
                </div>
                <p className="text-xs text-[#A3A3A3] mb-4 leading-relaxed">{aiWorkout.reasoning}</p>

                {/* Exercises Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {(aiWorkout.exercises || []).slice(0, 4).map((ex, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-white">{ex.name}</span>
                        <div className="text-[10px] text-[#737373]">{ex.muscle_group}</div>
                      </div>
                      <span className="text-[#EF4444] font-black text-xs">
                        {ex.suggested_sets}×{ex.suggested_reps} @ {ex.suggested_weight_kg || 0}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-8 text-center text-[#A3A3A3]">
                Ready to train? Click below to start an empty session or pick a template.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleStartAiWorkout}
              className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white py-3.5 px-6 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              <Play size={18} fill="currentColor" /> Start AI Workout
            </button>
            <button
              onClick={() => {
                triggerHaptic(HapticType.LIGHT);
                navigate('/templates');
              }}
              className="bg-[#171717] hover:bg-[#222222] border border-[#262626] text-white py-3.5 px-6 rounded-2xl font-bold transition-all text-sm cursor-pointer"
            >
              Routines
            </button>
          </div>
        </div>

        {/* Nutrition Target Donut */}
        <div className="bg-[#121212] rounded-3xl p-6 sm:p-7 border border-[#262626] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Apple size={20} className="text-[#EF4444]" /> Daily Diet
              </h2>
              <span className="text-xs text-[#A3A3A3] font-bold">Goal: {targetCals} kcal</span>
            </div>

            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#262626', borderRadius: '12px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-[#EF4444]">{eatenCals}</span>
                <span className="text-[11px] text-[#A3A3A3]">/ {targetCals} kcal</span>
              </div>
            </div>

            {/* Macro Stats */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-[#262626]">
                <div className="text-[10px] text-[#A3A3A3] font-bold">PROTEIN</div>
                <div className="font-black text-sm text-[#EF4444]">{eatenProtein}g</div>
                <div className="text-[10px] text-[#737373]">/ {targetProtein}g</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-[#262626]">
                <div className="text-[10px] text-[#A3A3A3] font-bold">CARBS</div>
                <div className="font-black text-sm text-white">{eatenCarbs}g</div>
                <div className="text-[10px] text-[#737373]">/ {targetCarbs}g</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-[#262626]">
                <div className="text-[10px] text-[#A3A3A3] font-bold">FAT</div>
                <div className="font-black text-sm text-[#A3A3A3]">{eatenFat}g</div>
                <div className="text-[10px] text-[#737373]">/ {targetFat}g</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic(HapticType.LIGHT);
              navigate('/nutrition');
            }}
            className="w-full mt-5 bg-[#171717] hover:bg-[#222222] border border-[#262626] text-white py-3 rounded-2xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Track Nutrition <ChevronRight size={14} className="text-[#EF4444]" />
          </button>
        </div>
      </div>

      {/* Weekly Activity & Goals / PRs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="bg-[#121212] rounded-3xl p-6 sm:p-7 border border-[#262626] lg:col-span-2 shadow-lg">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-[#EF4444]" /> Weekly Frequency
            </h2>
            <span className="text-xs text-[#A3A3A3] font-bold">{data?.weeklyWorkoutCount || 0} completed</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="name" stroke="#525252" axisLine={false} tickLine={false} />
                <YAxis stroke="#525252" axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#141414' }}
                  contentStyle={{
                    backgroundColor: '#0D0D0D',
                    borderColor: '#262626',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                  }}
                />
                <Bar dataKey="workouts" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goals & PRs Column */}
        <div className="space-y-6">
          {/* Recent PRs */}
          <div className="bg-[#121212] rounded-3xl p-6 border border-[#262626] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy size={18} className="text-[#EF4444]" /> Personal Records
              </h2>
            </div>
            {recentPrs.length > 0 ? (
              <div className="space-y-2.5">
                {recentPrs.slice(0, 3).map((pr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#262626]"
                  >
                    <div>
                      <div className="font-extrabold text-white text-sm">{pr.exercise_name || pr.exercise}</div>
                      <div className="text-[10px] text-[#737373]">{pr.date || 'Recent'}</div>
                    </div>
                    <div className="font-black text-sm text-[#EF4444] bg-[#EF4444]/10 px-2.5 py-1 rounded-xl border border-[#EF4444]/20">
                      {pr.weight_kg || pr.weight} kg
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#737373]">
                No records yet. Hit heavier lifts in your next workout!
              </div>
            )}
          </div>

          {/* Active Goals */}
          <div className="bg-[#121212] rounded-3xl p-6 border border-[#262626] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Target size={18} className="text-[#EF4444]" /> Milestones
              </h2>
              <button
                onClick={() => navigate('/goals')}
                className="text-xs text-[#EF4444] hover:underline font-bold"
              >
                All Goals
              </button>
            </div>
            {activeGoals.length > 0 ? (
              <div className="space-y-3">
                {activeGoals.map(goal => {
                  const pct = Math.min(100, Math.round(((goal.current_value || 0) / (goal.target_value || 1)) * 100));
                  return (
                    <div key={goal.id} className="p-3.5 bg-[#0D0D0D] rounded-2xl border border-[#262626]">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-bold text-white">{goal.title}</span>
                        <span className="text-[#EF4444] font-black">{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EF4444] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-[#737373] mb-3">No targets set yet.</p>
                <button
                  onClick={() => navigate('/goals')}
                  className="bg-[#171717] text-white hover:border-[#EF4444] border border-[#262626] px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  + Add Milestone Target
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
