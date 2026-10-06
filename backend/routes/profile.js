import express from 'express';
import db from '../db/init.js';

const router = express.Router();

function calculateTDEE(weight_kg, height_cm, age, gender, activity_level, goal) {
  let bmr;
  if (gender === 'female') {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
  } else {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
  }

  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };

  const multiplier = multipliers[activity_level] || 1.2;
  let tdee = bmr * multiplier;

  if (goal === 'bulk') tdee += 400;
  else if (goal === 'cut') tdee -= 400;

  return Math.round(tdee);
}

function ensureUserRecords(userId) {
  let prof = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId);
  if (!prof) {
    db.prepare(`
      INSERT INTO user_profile (user_id, name, weight_kg, height_cm, age, gender, goal, activity_level, tdee)
      VALUES (?, 'Athlete', 75, 175, 25, 'male', 'maintain', 'moderate', 2500)
    `).run(userId);
    prof = db.prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1').get(userId);
  }

  let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId);
  if (!prefs) {
    db.prepare(`
      INSERT INTO user_preferences (user_id, dietary_preference, unit_system, experience_level, workout_days_per_week, preferred_split, onboarding_complete)
      VALUES (?, 'non_veg', 'metric', 'intermediate', 5, 'ppl', 0)
    `).run(userId);
    prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1').get(userId);
  }

  return { prof, prefs };
}

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { prof, prefs } = ensureUserRecords(userId);
    res.json({ ...prof, ...prefs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { prof: currentProf } = ensureUserRecords(userId);
    const data = req.body;
    
    const w = data.weight_kg !== undefined ? data.weight_kg : currentProf.weight_kg;
    const h = data.height_cm !== undefined ? data.height_cm : currentProf.height_cm;
    const a = data.age !== undefined ? data.age : currentProf.age;
    const g = data.gender !== undefined ? data.gender : currentProf.gender;
    const act = data.activity_level !== undefined ? data.activity_level : currentProf.activity_level;
    const gl = data.goal !== undefined ? data.goal : currentProf.goal;
    
    const tdee = calculateTDEE(w, h, a, g, act, gl);

    db.transaction(() => {
      db.prepare(`
        UPDATE user_profile
        SET name = COALESCE(?, name),
            weight_kg = COALESCE(?, weight_kg),
            height_cm = COALESCE(?, height_cm),
            age = COALESCE(?, age),
            gender = COALESCE(?, gender),
            goal = COALESCE(?, goal),
            activity_level = COALESCE(?, activity_level),
            tdee = ?,
            updated_at = datetime('now')
        WHERE user_id = ? OR id = ?
      `).run(data.name, data.weight_kg, data.height_cm, data.age, data.gender, data.goal, data.activity_level, tdee, userId, userId);

      if (Object.keys(data).some(k => ['dietary_preference', 'unit_system', 'experience_level', 'workout_days_per_week', 'preferred_split', 'rest_timer_default', 'notifications_enabled'].includes(k))) {
        db.prepare(`
          UPDATE user_preferences
          SET dietary_preference = COALESCE(?, dietary_preference),
              unit_system = COALESCE(?, unit_system),
              experience_level = COALESCE(?, experience_level),
              workout_days_per_week = COALESCE(?, workout_days_per_week),
              preferred_split = COALESCE(?, preferred_split),
              rest_timer_default = COALESCE(?, rest_timer_default),
              notifications_enabled = COALESCE(?, notifications_enabled),
              updated_at = datetime('now')
          WHERE user_id = ? OR id = ?
        `).run(data.dietary_preference, data.unit_system, data.experience_level, data.workout_days_per_week, data.preferred_split, data.rest_timer_default, data.notifications_enabled, userId, userId);
      }
    })();
    
    const { prof: updatedProf, prefs: updatedPrefs } = ensureUserRecords(userId);
    res.json({ ...updatedProf, ...updatedPrefs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/onboarding-status', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { prefs } = ensureUserRecords(userId);
    res.json({ onboarding_complete: prefs ? !!prefs.onboarding_complete : false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/onboarding', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    ensureUserRecords(userId);
    const data = req.body;
    const { weight_kg, height_cm, age, gender, activity_level, goal } = data;
    
    const tdee = calculateTDEE(weight_kg, height_cm, age, gender, activity_level, goal);
    
    let protein = 0, carbs = 0, fat = 0, calories = 0;
    if (goal === 'bulk') {
      protein = 2 * weight_kg;
      carbs = 4.5 * weight_kg;
      fat = 1 * weight_kg;
      calories = tdee + 400;
    } else if (goal === 'cut') {
      protein = 2.2 * weight_kg;
      carbs = 2.5 * weight_kg;
      fat = 0.8 * weight_kg;
      calories = tdee - 400;
    } else {
      protein = 1.8 * weight_kg;
      carbs = 3.5 * weight_kg;
      fat = 1 * weight_kg;
      calories = tdee;
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE user_profile
        SET name = ?, weight_kg = ?, height_cm = ?, age = ?, gender = ?, goal = ?, activity_level = ?, tdee = ?, updated_at = datetime('now')
        WHERE user_id = ? OR id = ?
      `).run(data.name, weight_kg, height_cm, age, gender, goal, activity_level, tdee, userId, userId);

      db.prepare(`
        UPDATE user_preferences
        SET dietary_preference = ?, unit_system = ?, experience_level = ?, workout_days_per_week = ?, preferred_split = ?, rest_timer_default = ?, 
            onboarding_complete = 1, daily_calorie_target = ?, daily_protein_target = ?, daily_carbs_target = ?, daily_fat_target = ?, updated_at = datetime('now')
        WHERE user_id = ? OR id = ?
      `).run(data.dietary_preference, data.unit_system, data.experience_level, data.workout_days_per_week, data.preferred_split, data.rest_timer_default, calories, protein, carbs, fat, userId, userId);
    })();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
