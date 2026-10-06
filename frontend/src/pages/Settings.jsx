import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Settings as SettingsIcon, Sparkles, RotateCcw, LogOut } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { triggerHaptic, HapticType } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Athlete',
    age: 25,
    gender: 'male',
    height_cm: 175,
    weight_kg: 75,
    unit_system: 'metric',
    goal: 'maintain',
    experience_level: 'intermediate',
    workout_days_per_week: 5,
    preferred_split: 'ppl',
    rest_timer_default: 90,
    dietary_preference: 'non_veg',
    water_target_ml: 3000,
    tdee: 2500,
    daily_calorie_target: 2500,
    daily_protein_target: 150,
    daily_carbs_target: 260,
    daily_fat_target: 75,
  });

  const loadProfile = async () => {
    try {
      const data = await api('/profile');
      if (data) {
        setProfile(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: profile.name,
        age: parseInt(profile.age) || 25,
        gender: profile.gender,
        height_cm: parseFloat(profile.height_cm) || 175,
        weight_kg: parseFloat(profile.weight_kg) || 75,
        goal: profile.goal,
        unit_system: profile.unit_system,
        experience_level: profile.experience_level,
        workout_days_per_week: parseInt(profile.workout_days_per_week) || 5,
        preferred_split: profile.preferred_split,
        rest_timer_default: parseInt(profile.rest_timer_default) || 90,
        dietary_preference: profile.dietary_preference,
        water_target_ml: parseInt(profile.water_target_ml) || 3000,
      };

      const updated = await api('/profile', {
        method: 'PUT',
        body: payload,
      });

      setProfile(prev => ({ ...prev, ...updated }));
      triggerHaptic(HapticType.SUCCESS);
      showToast('Settings saved & blueprint recalculated! 🎯', 'success');
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelaunchOnboarding = () => {
    triggerHaptic(HapticType.LIGHT);
    navigate('/onboarding');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A3A3A3] gap-3 select-none">
        <div className="w-10 h-10 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs uppercase tracking-wider font-bold">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 pb-16 mx-auto select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white uppercase tracking-tight">
            <SettingsIcon className="text-[#EF4444]" size={32} /> Customization
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Calibrate biometrics, weekly training split, and macro thresholds.</p>
        </div>

        <button
          type="button"
          onClick={handleRelaunchOnboarding}
          className="bg-[#171717] hover:bg-[#222222] border border-[#262626] hover:border-[#EF4444] text-white px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw size={14} className="text-[#EF4444]" /> Relaunch Setup Wizard
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Profile Section */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#0D0D0D] p-5 border-b border-[#262626] flex justify-between items-center">
            <h2 className="text-sm font-black text-white uppercase">Personal Biometrics</h2>
            <span className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">Mifflin-St Jeor Engine</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Athlete Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name || ''}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Age</label>
                <input
                  type="number"
                  name="age"
                  value={profile.age || 25}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={profile.gender || 'male'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="male" className="bg-black text-white">Male</option>
                  <option value="female" className="bg-black text-white">Female</option>
                  <option value="other" className="bg-black text-white">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Unit System</label>
                <select
                  name="unit_system"
                  value={profile.unit_system || 'metric'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="metric" className="bg-black text-white">Metric (kg / cm)</option>
                  <option value="imperial" className="bg-black text-white">Imperial (lbs / inches)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Height (cm)</label>
                <input
                  type="number"
                  name="height_cm"
                  value={profile.height_cm || 175}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="weight_kg"
                  value={profile.weight_kg || 75}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Training Preferences */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-[#0D0D0D] p-5 border-b border-[#262626] flex justify-between items-center">
            <h2 className="text-sm font-black text-white uppercase">Training Parameters</h2>
            <span className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">AI Workout Tuning</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Primary Target</label>
                <select
                  name="goal"
                  value={profile.goal || 'maintain'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-[#EF4444] font-black focus:border-[#EF4444] outline-none"
                >
                  <option value="bulk" className="bg-black text-white">Bulk (Hypertrophy Surplus)</option>
                  <option value="cut" className="bg-black text-white">Cut (Fat Loss Deficit)</option>
                  <option value="maintain" className="bg-black text-white">Maintain (Strength Optimization)</option>
                  <option value="recomp" className="bg-black text-white">Body Recomposition</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Experience Level</label>
                <select
                  name="experience_level"
                  value={profile.experience_level || 'intermediate'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="beginner" className="bg-black text-white">Beginner (0-1 yrs)</option>
                  <option value="intermediate" className="bg-black text-white">Intermediate (1-3 yrs)</option>
                  <option value="advanced" className="bg-black text-white">Advanced (3+ yrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Training Split</label>
                <select
                  name="preferred_split"
                  value={profile.preferred_split || 'ppl'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="ppl" className="bg-black text-white">Push / Pull / Legs (PPL)</option>
                  <option value="upper_lower" className="bg-black text-white">Upper / Lower</option>
                  <option value="full_body" className="bg-black text-white">Full Body</option>
                  <option value="arnold" className="bg-black text-white">Arnold Split</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">Frequency</label>
                  <span className="font-bold text-[#EF4444] text-xs">{profile.workout_days_per_week || 5} Days / Week</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="7"
                  name="workout_days_per_week"
                  value={profile.workout_days_per_week || 5}
                  onChange={handleChange}
                  className="w-full mt-2 accent-[#EF4444]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Default Rest Timer</label>
                <select
                  name="rest_timer_default"
                  value={profile.rest_timer_default || 90}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="60" className="bg-black text-white">60s (Isolation movements)</option>
                  <option value="90" className="bg-black text-white">90s (Hypertrophy standard)</option>
                  <option value="120" className="bg-black text-white">120s (Heavy compound lifts)</option>
                  <option value="180" className="bg-black text-white">180s (Powerlifting strength)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Dietary Protocol</label>
                <select
                  name="dietary_preference"
                  value={profile.dietary_preference || 'non_veg'}
                  onChange={handleChange}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 text-xs text-white focus:border-[#EF4444] outline-none font-bold"
                >
                  <option value="non_veg" className="bg-black text-white">Non-Vegetarian (All foods)</option>
                  <option value="veg" className="bg-black text-white">Vegetarian (Dairy & paneer included)</option>
                  <option value="vegan" className="bg-black text-white">Vegan (100% plant-based)</option>
                  <option value="eggetarian" className="bg-black text-white">Eggetarian (Vegetarian + eggs)</option>
                </select>
              </div>
            </div>

            {/* Calculated Blueprint Card */}
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-5 mt-6">
              <h3 className="font-black text-xs text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#EF4444]" /> Active Calculated Blueprint
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
                  <div className="text-[10px] font-bold text-[#A3A3A3]">BMR / TDEE</div>
                  <div className="font-black text-white text-base mt-0.5">{profile.tdee || 2500} kcal</div>
                </div>
                <div className="bg-[#141414] p-3 rounded-xl border border-[#EF4444]/30">
                  <div className="text-[10px] font-bold text-[#EF4444]">DAILY TARGET</div>
                  <div className="font-black text-[#EF4444] text-base mt-0.5">
                    {profile.daily_calorie_target || profile.tdee || 2500} kcal
                  </div>
                </div>
                <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
                  <div className="text-[10px] font-bold text-[#A3A3A3]">PROTEIN</div>
                  <div className="font-black text-white text-base mt-0.5">
                    {profile.daily_protein_target || Math.round((profile.weight_kg || 75) * 2)}g
                  </div>
                </div>
                <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
                  <div className="text-[10px] font-bold text-[#A3A3A3]">WATER TARGET</div>
                  <div className="font-black text-white text-base mt-0.5">
                    {((profile.water_target_ml || 3000) / 1000).toFixed(1)} L
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account & Session Management */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#A3A3A3]">
                Signed In Athlete
              </div>
              <div className="text-lg font-bold text-white mt-0.5">
                {user?.name || profile.name}
              </div>
              <div className="text-xs text-[#737373] mt-0.5">
                {user?.email || 'Local Athlete Session'}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#262626] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-8 py-3.5 rounded-2xl font-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 text-sm cursor-pointer"
          >
            <Save size={18} /> {submitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
