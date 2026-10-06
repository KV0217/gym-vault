import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Play, CheckCircle2, TrendingUp, Activity, Apple, RefreshCw, Send, Sparkles, Dumbbell } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function AICoach() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [insights, setInsights] = useState([]);
  const [progressAnalysis, setProgressAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Welcome athlete! I am your AI Strength & Diet Coach. I monitor your overload history, volume trends, and macro goals. Ask any question or start today's customized workout below!",
    },
  ]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isLoggingDiet, setIsLoggingDiet] = useState(false);

  const fetchAIData = async () => {
    setLoading(true);
    try {
      const [wRes, dRes, iRes, pRes] = await Promise.allSettled([
        api('/ai/workout-suggestion'),
        api('/ai/diet-plan'),
        api('/ai/smart-insights'),
        api('/ai/progress-analysis'),
      ]);

      if (wRes.status === 'fulfilled') setWorkout(wRes.value);
      if (dRes.status === 'fulfilled') setDietPlan(dRes.value);
      if (iRes.status === 'fulfilled') setInsights(iRes.value?.insights || []);
      if (pRes.status === 'fulfilled') setProgressAnalysis(pRes.value);
    } catch (err) {
      console.error('Error fetching AI data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIData();
  }, []);

  const handleStartWorkout = () => {
    triggerHaptic(HapticType.MEDIUM);
    if (!workout || !workout.exercises) return;
    navigate('/workouts/new', {
      state: {
        templateName: workout.workout_name,
        suggestedExercises: workout.exercises,
      },
    });
  };

  const handleLogDietPlan = async () => {
    triggerHaptic(HapticType.SUCCESS);
    if (!dietPlan || !dietPlan.meals) return;
    setIsLoggingDiet(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      for (const meal of dietPlan.meals) {
        if (meal.foods && meal.foods.length > 0) {
          const entries = meal.foods.map(f => ({
            food_item_id: f.food_id || f.id,
            quantity_g: f.quantity_g || 100,
          }));
          await api('/nutrition/meals', {
            method: 'POST',
            body: {
              date: today,
              meal_type: meal.meal_type,
              entries,
            },
          });
        }
      }
      showToast('All meals logged for today!', 'success');
    } catch (err) {
      showToast('Failed to log diet plan: ' + err.message, 'error');
    } finally {
      setIsLoggingDiet(false);
    }
  };

  const handleAskQuestion = async (textToSend) => {
    const q = textToSend || question;
    if (!q.trim() || isAsking) return;

    triggerHaptic(HapticType.LIGHT);
    const userMsgId = Date.now();
    setChatHistory(prev => [...prev, { id: userMsgId, sender: 'user', text: q }]);
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await api('/ai/ask', {
        method: 'POST',
        body: { question: q },
      });

      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: res.answer || "I've analyzed your stats and updated your targets.",
        },
      ]);
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: "Focus on hitting 2g/kg protein daily and progressive overload on compound lifts. Keep your rest intervals between 90-120s.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#A3A3A3] font-bold text-xs tracking-widest uppercase">
          Synthesizing AI Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-[#121212] rounded-3xl p-6 sm:p-8 border border-[#262626] relative overflow-hidden shadow-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="text-xs font-black text-[#EF4444] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#EF4444]" /> ADAPTIVE ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">AI Coach</h1>
          <p className="text-sm text-[#A3A3A3] mt-1 max-w-xl">
            Real-time workout suggestions, progressive overload tracking, and macro recalibration.
          </p>
        </div>

        <button
          onClick={fetchAIData}
          className="bg-[#171717] hover:bg-[#222222] border border-[#262626] text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className="text-[#EF4444]" /> Refresh Analysis
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Suggested Workout */}
          {workout && (
            <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
              <div className="bg-[#0D0D0D] p-5 sm:p-6 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[#EF4444] text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Dumbbell size={14} className="text-[#EF4444]" /> SUGGESTED WORKOUT
                  </div>
                  <h2 className="text-2xl font-black text-white">{workout.workout_name}</h2>
                  <div className="text-xs text-[#A3A3A3] mt-1 italic">{workout.reasoning}</div>
                </div>

                <button
                  onClick={handleStartWorkout}
                  className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] shrink-0 cursor-pointer"
                >
                  <Play size={16} fill="currentColor" /> Start Workout
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                  Target Exercises & Progression
                </div>
                <div className="space-y-2.5">
                  {(workout.exercises || []).map((ex, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{ex.name}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black text-[#EF4444] border border-[#262626] uppercase">
                            {ex.muscle_group}
                          </span>
                        </div>
                        {ex.progression_note && (
                          <div className="text-xs text-white mt-1 flex items-center gap-1 font-medium">
                            <TrendingUp size={12} className="text-[#EF4444]" /> {ex.progression_note}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <div className="text-sm font-black text-[#EF4444]">
                          {ex.suggested_sets} sets × {ex.suggested_reps} reps
                        </div>
                        <div className="text-xs font-bold text-[#A3A3A3]">
                          Target: {ex.suggested_weight_kg > 0 ? `${ex.suggested_weight_kg} kg` : 'Bodyweight'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Diet Plan */}
          {dietPlan && (
            <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
              <div className="bg-[#0D0D0D] p-5 sm:p-6 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[#EF4444] text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Apple size={14} className="text-[#EF4444]" /> AI NUTRITION PROTOCOL
                  </div>
                  <h2 className="text-2xl font-black text-white">Daily Meal Plan</h2>
                  <div className="text-xs text-[#A3A3A3] mt-0.5">{dietPlan.goal_context}</div>
                </div>

                <button
                  onClick={handleLogDietPlan}
                  disabled={isLoggingDiet}
                  className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <CheckCircle2 size={16} className="text-[#EF4444]" /> {isLoggingDiet ? 'Logging...' : 'Log Meals Today'}
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {/* Macro Target Strip */}
                <div className="grid grid-cols-4 gap-2 text-center p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#262626]">
                  <div>
                    <div className="text-[10px] text-[#A3A3A3] font-bold">CALORIES</div>
                    <div className="text-base font-black text-[#EF4444]">
                      {dietPlan.plan_totals?.calories || 0}
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      Goal: {dietPlan.daily_targets?.calories || 2500}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A3A3A3] font-bold">PROTEIN</div>
                    <div className="text-base font-black text-[#EF4444]">
                      {dietPlan.plan_totals?.protein || 0}g
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      Goal: {dietPlan.daily_targets?.protein || 150}g
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A3A3A3] font-bold">CARBS</div>
                    <div className="text-base font-black text-white">
                      {dietPlan.plan_totals?.carbs || 0}g
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      Goal: {dietPlan.daily_targets?.carbs || 250}g
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A3A3A3] font-bold">FAT</div>
                    <div className="text-base font-black text-[#A3A3A3]">
                      {dietPlan.plan_totals?.fat || 0}g
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      Goal: {dietPlan.daily_targets?.fat || 70}g
                    </div>
                  </div>
                </div>

                {/* Meals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(dietPlan.meals || []).map((meal, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#262626]">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#1F1F1F]">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-white">
                          {meal.meal_type}
                        </span>
                        <span className="text-[11px] font-black text-[#EF4444]">
                          {meal.meal_totals?.calories || 0} kcal • {meal.meal_totals?.protein || 0}g P
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {(meal.foods || []).map((f, fi) => (
                          <div key={fi} className="flex justify-between text-xs text-white">
                            <span>
                              {f.name} <span className="text-[#737373]">({f.quantity_g}g)</span>
                            </span>
                            <span className="text-[#A3A3A3] font-bold">{f.protein}g P</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Smart Insights */}
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 sm:p-6 shadow-xl">
            <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[#EF4444]" /> Adaptive Intelligence
            </h2>
            <div className="space-y-3">
              {insights.map((ins, idx) => {
                const isHigh = ins.priority === 'high';
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#0D0D0D] border-l-4 border-[#EF4444] border-t border-r border-b border-[#262626] flex items-start gap-3"
                  >
                    <Bot size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {ins.title}
                        {isHigh && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] uppercase">
                            HIGH
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">{ins.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Chat with AI Coach */}
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[460px]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#262626] mb-4">
              <div className="w-8 h-8 rounded-xl bg-black border border-[#262626] flex items-center justify-center">
                <Bot size={16} className="text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase">Coach Assistant</h3>
                <div className="text-[10px] text-[#A3A3A3]">Ask training, diet, or recovery questions</div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {chatHistory.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#0D0D0D] text-white border border-[#262626]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-[#0D0D0D] text-[#A3A3A3] border border-[#262626] p-3 rounded-2xl text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                    Analyzing training records...
                  </div>
                </div>
              )}
            </div>

            {/* Input Box */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="mt-4 pt-3 border-t border-[#262626] flex gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about sets, protein, or deloads..."
                className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#EF4444] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
