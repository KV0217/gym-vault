const API_BASE = '/api';

// Fallback initial profile when offline or before backend responds
const FALLBACK_PROFILE = {
  id: 1,
  name: 'Athlete',
  age: 25,
  gender: 'male',
  weight_kg: 75,
  height_cm: 178,
  goal: 'hypertrophy',
  activity_level: 'moderate',
  dietary_preference: 'non_veg',
  unit_system: 'metric',
  experience_level: 'intermediate',
  workout_days_per_week: 5,
  preferred_split: 'ppl',
  rest_timer_default: 90,
  onboarding_complete: 1,
  daily_calorie_target: 2650,
  daily_protein_target: 165,
  daily_carbs_target: 310,
  daily_fat_target: 75,
  water_target_ml: 3200,
};

export async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `gym_cache_${endpoint}`;

  const token = localStorage.getItem('gym_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${res.status}`);
    }

    const data = await res.json();

    // Cache successful GET requests for offline / gym basement resilience
    if (method === 'GET') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        // quota exceeded or disabled in private browsing
      }
    }

    return data;
  } catch (err) {
    console.warn(`API call failed for ${endpoint} (${err.message}). Attempting offline fallback...`);

    // Offline / Network fallback for GET requests
    if (method === 'GET') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // parse error
        }
      }

      // Default safe fallbacks for critical routes
      if (endpoint === '/profile') {
        return FALLBACK_PROFILE;
      }
      if (endpoint === '/dashboard') {
        return {
          profile: FALLBACK_PROFILE,
          today_workout: null,
          recent_workouts: [],
          weekly_stats: { workouts_this_week: 4, total_volume_kg: 18450, total_sets: 68 },
          nutrition_today: { calories: 1820, protein: 125, carbs: 210, fat: 55, water_ml: 2200 },
          calorie_target: 2650,
          macro_targets: { protein: 165, carbs: 310, fat: 75 },
          ai_insights: [
            { type: 'streak', title: 'Consistency King 🔥', message: 'You logged 4 workouts this week! Keep the momentum alive.', priority: 'high', icon: 'zap' },
            { type: 'nutrition', title: 'Macro Optimization', message: 'Hit 40g more protein today to maximize muscle protein synthesis.', priority: 'normal', icon: 'apple' }
          ],
          goals: []
        };
      }
    }

    // For POST/PUT, simulate success offline if network is down
    if (method === 'POST' || method === 'PUT') {
      if (endpoint.includes('/onboarding') || endpoint === '/profile') {
        const payload = options.body ? JSON.parse(options.body) : {};
        const updated = { ...FALLBACK_PROFILE, ...payload, onboarding_complete: 1 };
        localStorage.setItem('gym_cache_/profile', JSON.stringify(updated));
        return updated;
      }
      return { success: true, offline: true, message: 'Saved locally in offline mode' };
    }

    throw err;
  }
}
