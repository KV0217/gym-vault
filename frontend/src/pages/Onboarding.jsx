import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Flame,
  Scale,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Droplets,
  User,
  Calendar,
  Zap,
  Target,
  Apple,
  Activity,
  Award
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function Onboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    name: '',
    age: 25,
    gender: 'Male',
    weight: 75,
    height: 175,
    unitSystem: 'Metric',
    goal: 'Bulk',
    experienceLevel: 'Intermediate',
    workoutDays: 5,
    preferredSplit: 'PPL',
    restTimer: 90,
    dietPreference: 'Non-Veg',
    waterTarget: 3,
  });

  const updateData = (fields) => {
    triggerHaptic(HapticType.LIGHT);
    setData(prev => ({ ...prev, ...fields }));
  };

  const next = () => {
    triggerHaptic(HapticType.LIGHT);
    setStep(s => Math.min(s + 1, 7));
  };

  const back = () => {
    triggerHaptic(HapticType.LIGHT);
    setStep(s => Math.max(s - 1, 1));
  };

  // Mifflin-St Jeor calculation
  const getCalculations = () => {
    const weightKg = data.unitSystem === 'Metric' ? parseFloat(data.weight) || 75 : (parseFloat(data.weight) || 165) * 0.453592;
    const heightCm = data.unitSystem === 'Metric' ? parseFloat(data.height) || 175 : (parseFloat(data.height) || 69) * 2.54;
    const age = parseInt(data.age) || 25;
    const isMale = data.gender.toLowerCase() === 'male';

    const bmr = isMale
      ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
      : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;

    let actMultiplier = 1.375;
    if (data.workoutDays >= 6) actMultiplier = 1.725;
    else if (data.workoutDays >= 4) actMultiplier = 1.55;
    else if (data.workoutDays >= 3) actMultiplier = 1.375;
    else actMultiplier = 1.2;

    const maintenanceTdee = Math.round(bmr * actMultiplier);
    const goalLower = data.goal.toLowerCase();

    let targetCalories = maintenanceTdee;
    let proteinG = Math.round(weightKg * 1.8);
    let carbsG = Math.round(weightKg * 3.5);
    let fatG = Math.round(weightKg * 1.0);

    if (goalLower === 'bulk') {
      targetCalories = maintenanceTdee + 400;
      proteinG = Math.round(weightKg * 2.0);
      carbsG = Math.round(weightKg * 4.5);
      fatG = Math.round(weightKg * 1.0);
    } else if (goalLower === 'cut') {
      targetCalories = maintenanceTdee - 400;
      proteinG = Math.round(weightKg * 2.2);
      carbsG = Math.round(weightKg * 2.5);
      fatG = Math.round(weightKg * 0.8);
    } else if (goalLower === 'recomp') {
      targetCalories = maintenanceTdee - 100;
      proteinG = Math.round(weightKg * 2.2);
      carbsG = Math.round(weightKg * 3.0);
      fatG = Math.round(weightKg * 0.9);
    }

    const heightM = heightCm / 100;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

    return {
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(heightCm),
      bmi,
      bmr: Math.round(bmr),
      tdee: maintenanceTdee,
      targetCalories,
      proteinG,
      carbsG,
      fatG,
    };
  };

  const calcs = getCalculations();

  const completeOnboarding = async () => {
    triggerHaptic(HapticType.PR);
    setSubmitting(true);
    try {
      const splitMap = {
        'PPL': 'ppl',
        'Upper-Lower': 'upper_lower',
        'Full Body': 'full_body',
        'Arnold': 'arnold',
      };
      const dietMap = {
        'Non-Veg': 'non_veg',
        'Vegetarian': 'veg',
        'Vegan': 'vegan',
        'Eggetarian': 'eggetarian',
      };

      const payload = {
        name: data.name.trim() || 'Athlete',
        age: parseInt(data.age) || 25,
        gender: data.gender.toLowerCase(),
        weight_kg: calcs.weightKg,
        height_cm: calcs.heightCm,
        goal: data.goal.toLowerCase(),
        activity_level: data.workoutDays >= 5 ? 'heavy' : data.workoutDays >= 3 ? 'moderate' : 'light',
        experience_level: data.experienceLevel.toLowerCase(),
        dietary_preference: dietMap[data.dietPreference] || 'non_veg',
        unit_system: data.unitSystem.toLowerCase(),
        workout_days_per_week: data.workoutDays,
        preferred_split: splitMap[data.preferredSplit] || 'ppl',
        rest_timer_default: data.restTimer,
        water_target_ml: Math.round(data.waterTarget * 1000),
      };

      await api('/profile/onboarding', {
        method: 'POST',
        body: payload,
      });

      try {
        await api('/body-metrics', {
          method: 'POST',
          body: {
            weight_kg: calcs.weightKg,
            notes: 'Initial weight recorded during onboarding',
          },
        });
      } catch {
        // non-blocking
      }

      showToast(`Welcome ${payload.name}! Your AI training regimen is initialized.`, 'success');
      navigate('/');
    } catch (err) {
      console.error(err);
      showToast('Error saving onboarding: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Outer Card with High-End Monochrome Finish & Red Accents */}
      <div className="w-full max-w-2xl sm:max-w-3xl bg-[#0D0D0D] border border-[#262626] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col">
        {/* Sleek Top Red Progress Line */}
        <div className="h-1.5 bg-[#1F1F1F] w-full relative">
          <div
            className="h-full bg-[#EF4444] transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        {/* Content Box */}
        <div className="p-6 sm:p-10 flex flex-col flex-1 justify-between min-h-[520px]">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-[#262626] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse"></span>
              <span className="text-xs font-black tracking-widest text-[#A3A3A3] uppercase">
                AI Athlete Onboarding
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#171717] px-3 py-1 rounded-full border border-[#262626]">
              <span className="text-xs font-extrabold text-white">Step {step}</span>
              <span className="text-xs text-[#737373]">/ 7</span>
            </div>
          </div>

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-8 py-4 animate-fade-in-up">
              <div className="text-center space-y-4">
                <div className="inline-flex p-5 rounded-3xl bg-[#141414] border border-[#262626] shadow-inner">
                  <Dumbbell size={52} className="text-[#EF4444]" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
                  Build Your Routine
                </h1>
                <p className="text-sm sm:text-base text-[#A3A3A3] max-w-lg mx-auto leading-relaxed">
                  Precision workout tracking, intelligent progressive overload, and personalized nutrition designed for maximum performance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black border border-[#262626] flex items-center justify-center shrink-0">
                    <Target size={20} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Customized</div>
                    <div className="text-[11px] text-[#737373]">Targeted to your split</div>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black border border-[#262626] flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">AI Engine</div>
                    <div className="text-[11px] text-[#737373]">Adaptive progressive sets</div>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black border border-[#262626] flex items-center justify-center shrink-0">
                    <Apple size={20} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Smart Macros</div>
                    <div className="text-[11px] text-[#737373]">TDEE & diet automation</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Athlete Profile
                </h2>
                <p className="text-sm text-[#A3A3A3] mt-1">Let's set up your personal training identity.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                    Athlete Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.name}
                      onChange={e => updateData({ name: e.target.value })}
                      placeholder="e.g. Alex"
                      className="w-full h-13 px-4 bg-[#141414] border border-[#262626] rounded-2xl text-white text-base placeholder-[#525252] focus:border-[#EF4444] focus:outline-none transition-colors"
                    />
                    <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#EF4444]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={data.age}
                      onChange={e => updateData({ age: e.target.value })}
                      className="w-full h-13 px-4 bg-[#141414] border border-[#262626] rounded-2xl text-white text-base focus:border-[#EF4444] focus:outline-none transition-colors"
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                      Biological Sex (for BMR)
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-13">
                      {['Male', 'Female'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateData({ gender: g })}
                          className={`rounded-2xl border font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            data.gender === g
                              ? 'bg-white text-black border-white shadow-md'
                              : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:text-white hover:border-[#404040]'
                          }`}
                        >
                          <User size={15} className={data.gender === g ? 'text-[#EF4444]' : 'text-[#737373]'} />
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BODY METRICS */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    Body Measurements
                  </h2>
                  <p className="text-sm text-[#A3A3A3] mt-1">Required to calibrate your daily energy targets.</p>
                </div>
                <div className="flex bg-[#141414] p-1 rounded-2xl border border-[#262626]">
                  {['Metric', 'Imperial'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => updateData({ unitSystem: u })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        data.unitSystem === u
                          ? 'bg-[#EF4444] text-white'
                          : 'text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#141414] border border-[#262626] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                      Weight ({data.unitSystem === 'Metric' ? 'kg' : 'lbs'})
                    </span>
                    <Scale size={18} className="text-[#EF4444]" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={data.weight}
                    onChange={e => updateData({ weight: e.target.value })}
                    className="w-full text-3xl font-black bg-transparent border-b border-[#262626] pb-2 text-white focus:border-[#EF4444] focus:outline-none"
                  />
                  <div className="text-[11px] text-[#737373] mt-2">
                    Used to calculate protein and creatine targets
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#262626] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                      Height ({data.unitSystem === 'Metric' ? 'cm' : 'inches'})
                    </span>
                    <Activity size={18} className="text-[#EF4444]" />
                  </div>
                  <input
                    type="number"
                    value={data.height}
                    onChange={e => updateData({ height: e.target.value })}
                    className="w-full text-3xl font-black bg-transparent border-b border-[#262626] pb-2 text-white focus:border-[#EF4444] focus:outline-none"
                  />
                  <div className="text-[11px] text-[#737373] mt-2">
                    Live BMI Estimate: <span className="font-bold text-white">{calcs.bmi}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: GOAL */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Primary Objective
                </h2>
                <p className="text-sm text-[#A3A3A3] mt-1">Select your focus to calibrate diet and workout programming.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { id: 'Bulk', title: 'Lean Bulk', desc: 'Hypertrophy & muscle gain (+400 kcal surplus)', icon: Dumbbell },
                  { id: 'Cut', title: 'Aggressive Cut', desc: 'Fat loss with muscle retention (-400 kcal deficit)', icon: Flame },
                  { id: 'Maintain', title: 'Strength & Maintain', desc: 'Optimize lifting numbers at maintenance calories', icon: Scale },
                  { id: 'Recomp', title: 'Body Recomposition', desc: 'Simultaneous fat loss and muscle building', icon: RefreshCw },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = data.goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateData({ goal: item.id })}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-[#171717] border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                          : 'bg-[#141414] border-[#262626] hover:border-[#404040]'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        isSelected ? 'bg-black border-[#EF4444]' : 'bg-[#1A1A1A] border-[#262626]'
                      }`}>
                        <Icon size={22} className="text-[#EF4444]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-extrabold text-white flex items-center justify-between">
                          {item.title}
                          {isSelected && <CheckCircle2 size={16} className="text-[#EF4444]" />}
                        </div>
                        <div className="text-xs text-[#A3A3A3] mt-1 leading-snug">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: SPLIT & EXPERIENCE */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Training Split & Schedule
                </h2>
                <p className="text-sm text-[#A3A3A3] mt-1">Configure your weekly gym frequency and preferred split.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                    Workout Days per Week
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[3, 4, 5, 6, 7].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateData({ workoutDays: d })}
                        className={`py-3 rounded-2xl border font-black text-base transition-all cursor-pointer ${
                          data.workoutDays === d
                            ? 'bg-[#EF4444] text-white border-[#EF4444]'
                            : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:text-white'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                    Preferred Split
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'PPL', title: 'Push / Pull / Legs', desc: 'Classic 3-6 day bodybuilding split' },
                      { id: 'Upper-Lower', title: 'Upper / Lower', desc: 'Balanced 4 day athletic split' },
                      { id: 'Full Body', title: 'Full Body', desc: 'Maximum frequency 3 day routine' },
                      { id: 'Arnold', title: 'Arnold Split', desc: 'Chest/Back, Shoulders/Arms, Legs' },
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateData({ preferredSplit: s.id })}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          data.preferredSplit === s.id
                            ? 'bg-[#171717] border-[#EF4444]'
                            : 'bg-[#141414] border-[#262626] hover:border-[#404040]'
                        }`}
                      >
                        <div className="text-sm font-bold text-white flex items-center justify-between">
                          {s.title}
                          {data.preferredSplit === s.id && <Dumbbell size={14} className="text-[#EF4444]" />}
                        </div>
                        <div className="text-[11px] text-[#A3A3A3] mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">
                    Rest Timer Between Sets
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[60, 90, 120, 180].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateData({ restTimer: t })}
                        className={`py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          data.restTimer === t
                            ? 'bg-white text-black border-white'
                            : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:text-white'
                        }`}
                      >
                        {t}s Rest
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DIET & HYDRATION (FIXED SPACING & LUXURY RED ACCENTS) */}
          {step === 6 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Diet & Hydration
                </h2>
                <p className="text-sm text-[#A3A3A3] mt-1">Tailor meal recommendations and daily water targets.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">
                    Dietary Preference
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'Non-Veg', title: 'Non-Vegetarian', desc: 'Chicken, Salmon, Tuna, Eggs, Lean Beef, Dairy', icon: Flame },
                      { id: 'Vegetarian', title: 'Vegetarian', desc: 'Paneer, Tofu, Lentils, Chickpeas, Greek Yogurt', icon: Apple },
                      { id: 'Vegan', title: '100% Plant-Based', desc: 'Legumes, Oats, Soy, Seeds, Plant Protein Powders', icon: Sparkles },
                      { id: 'Eggetarian', title: 'Eggetarian', desc: 'Vegetarian + Whole Eggs & Egg Whites', icon: Award },
                    ].map(d => {
                      const Icon = d.icon;
                      const isSelected = data.dietPreference === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => updateData({ dietPreference: d.id })}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                            isSelected
                              ? 'bg-[#171717] border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                              : 'bg-[#141414] border-[#262626] hover:border-[#404040]'
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl border shrink-0 ${
                            isSelected ? 'bg-black border-[#EF4444]' : 'bg-[#1A1A1A] border-[#262626]'
                          }`}>
                            <Icon size={20} className="text-[#EF4444]" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-extrabold text-white flex items-center justify-between">
                              {d.title}
                              {isSelected && <CheckCircle2 size={16} className="text-[#EF4444]" />}
                            </div>
                            <div className="text-xs text-[#A3A3A3] mt-1 leading-snug">{d.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                      Daily Water Target
                    </label>
                    <span className="text-xs font-extrabold text-white flex items-center gap-1">
                      <Droplets size={14} className="text-[#EF4444]" /> {data.waterTarget} Liters / Day
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[2, 2.5, 3, 3.5, 4].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateData({ waterTarget: w })}
                        className={`py-3 rounded-2xl border font-bold text-sm transition-all cursor-pointer ${
                          data.waterTarget === w
                            ? 'bg-[#EF4444] text-white border-[#EF4444]'
                            : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:text-white'
                        }`}
                      >
                        {w}L
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: BLUEPRINT REVIEW */}
          {step === 7 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Your AI Training Blueprint
                </h2>
                <p className="text-sm text-[#A3A3A3] mt-1">Calibrated from your biometric profile and fitness targets.</p>
              </div>

              <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-[#262626] pb-4">
                  <div className="bg-black/60 p-3 rounded-xl border border-[#262626]">
                    <div className="text-[11px] text-[#A3A3A3] uppercase font-bold">Goal</div>
                    <div className="text-sm font-black text-[#EF4444] mt-0.5">{data.goal}</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-[#262626]">
                    <div className="text-[11px] text-[#A3A3A3] uppercase font-bold">Split</div>
                    <div className="text-sm font-black text-white mt-0.5">{data.preferredSplit}</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-[#262626]">
                    <div className="text-[11px] text-[#A3A3A3] uppercase font-bold">Days / Wk</div>
                    <div className="text-sm font-black text-white mt-0.5">{data.workoutDays} Days</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-[#262626]">
                    <div className="text-[11px] text-[#A3A3A3] uppercase font-bold">Diet</div>
                    <div className="text-sm font-black text-white mt-0.5">{data.dietPreference}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div>
                    <span className="text-xs text-[#A3A3A3] uppercase font-bold">Daily Calorie Target</span>
                    <div className="text-xs text-[#737373]">Maintenance TDEE: {calcs.tdee} kcal</div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#EF4444]">{calcs.targetCalories}</span>
                    <span className="text-xs text-[#A3A3A3] ml-1">kcal / day</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  <div className="bg-black border border-[#262626] p-3 rounded-xl text-center">
                    <div className="text-xs text-[#A3A3A3] font-bold">Protein</div>
                    <div className="text-lg font-black text-[#EF4444]">{calcs.proteinG}g</div>
                  </div>
                  <div className="bg-black border border-[#262626] p-3 rounded-xl text-center">
                    <div className="text-xs text-[#A3A3A3] font-bold">Carbs</div>
                    <div className="text-lg font-black text-white">{calcs.carbsG}g</div>
                  </div>
                  <div className="bg-black border border-[#262626] p-3 rounded-xl text-center">
                    <div className="text-xs text-[#A3A3A3] font-bold">Fat</div>
                    <div className="text-lg font-black text-white">{calcs.fatG}g</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS (Spacious, prominent, never squished or clipped) */}
          <div className="pt-8 mt-6 border-t border-[#262626] flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="h-13 px-6 rounded-2xl font-bold text-sm text-[#A3A3A3] hover:text-white bg-[#141414] border border-[#262626] hover:border-[#404040] transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft size={16} className="text-[#EF4444]" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 7 ? (
              <button
                type="button"
                onClick={next}
                className="h-13 px-8 rounded-2xl font-extrabold text-sm text-white bg-[#EF4444] hover:bg-[#DC2626] shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto"
              >
                {step === 1 ? 'Start Setup' : 'Next Step'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={completeOnboarding}
                className="h-13 px-8 rounded-2xl font-black text-sm text-white bg-[#EF4444] hover:bg-[#DC2626] shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto disabled:opacity-50"
              >
                <Flame size={18} />
                {submitting ? 'Generating AI Regimen...' : 'Launch Training Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
