import express from 'express';
import db from '../db/init.js';
import { getSmartInsights } from '../utils/aiEngine.js';

const router = express.Router();

// ─── Helper: get user profile + preferences merged ───
function getUserContext(userId = 1) {
  const profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId) || {};
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId) || {};
  return { ...profile, ...prefs };
}

// ─── Helper: calculate food macros for a given quantity ───
function calcMacros(food, quantity_g) {
  const factor = quantity_g / 100;
  return {
    calories: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_g * factor * 10) / 10,
    carbs: Math.round(food.carbs_g * factor * 10) / 10,
    fat: Math.round(food.fat_g * factor * 10) / 10,
  };
}

// ─── Helper: get last performance for an exercise ───
function getLastPerformance(exerciseId, userId = 1) {
  return db.prepare(`
    SELECT w.date, MAX(sl.weight_kg) as weight, MAX(sl.reps) as reps,
           SUM(sl.reps) as total_reps, COUNT(sl.id) as total_sets
    FROM set_logs sl
    JOIN exercise_logs el ON sl.exercise_log_id = el.id
    JOIN workout_sessions w ON el.session_id = w.id
    WHERE el.exercise_id = ? AND sl.completed = 1 AND (w.user_id = ? OR w.user_id IS NULL)
    ORDER BY w.date DESC
    LIMIT 1
  `).get(exerciseId, userId);
}

// ═══════════════════════════════════════════
// GET /smart-insights
// ═══════════════════════════════════════════
router.get('/smart-insights', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const insights = getSmartInsights(userId);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════
// GET /workout-suggestion
// ═══════════════════════════════════════════
router.get('/workout-suggestion', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const ctx = getUserContext(userId);
    const split = ctx.preferred_split || 'ppl';
    const expLevel = ctx.experience_level || 'intermediate';

    // Determine sets/reps based on experience
    const setsReps = {
      beginner:     { compound: { sets: 3, reps: 10 }, isolation: { sets: 2, reps: 12 } },
      intermediate: { compound: { sets: 4, reps: 8  }, isolation: { sets: 3, reps: 12 } },
      advanced:     { compound: { sets: 5, reps: 6  }, isolation: { sets: 4, reps: 10 } },
    }[expLevel] || { compound: { sets: 4, reps: 8 }, isolation: { sets: 3, reps: 12 } };

    // Find which muscle groups were trained in the last 7 days
    const recentWorkouts = db.prepare(`
      SELECT DISTINCT e.muscle_group, MAX(w.date) as last_trained
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN exercises e ON el.exercise_id = e.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= date('now', '-7 days') AND sl.completed = 1
      GROUP BY e.muscle_group
    `).all();

    const trainedMap = {};
    recentWorkouts.forEach(r => { trainedMap[r.muscle_group] = r.last_trained; });

    // Determine target muscles and workout name based on split
    let targetMuscles = [];
    let workoutName = 'Full Body';
    let reasoning = '';

    if (split === 'ppl') {
      const pushTrained = trainedMap['Chest'] || trainedMap['Shoulders'];
      const pullTrained = trainedMap['Back'];
      const legsTrained = trainedMap['Legs'];
      
      if (!pushTrained) {
        targetMuscles = ['Chest', 'Shoulders', 'Triceps'];
        workoutName = 'Push Day';
        reasoning = 'Your chest and shoulders haven\'t been trained recently. Time for a push session!';
      } else if (!pullTrained) {
        targetMuscles = ['Back', 'Biceps'];
        workoutName = 'Pull Day';
        reasoning = 'Your back needs attention. Let\'s hit a pull workout today!';
      } else if (!legsTrained) {
        targetMuscles = ['Legs'];
        workoutName = 'Leg Day';
        reasoning = 'Don\'t skip leg day! Your lower body is due for training.';
      } else {
        // All trained recently, suggest the least recent
        const groups = [
          { name: 'Push Day', muscles: ['Chest', 'Shoulders', 'Triceps'], date: trainedMap['Chest'] || '2000-01-01' },
          { name: 'Pull Day', muscles: ['Back', 'Biceps'], date: trainedMap['Back'] || '2000-01-01' },
          { name: 'Leg Day', muscles: ['Legs'], date: trainedMap['Legs'] || '2000-01-01' },
        ];
        groups.sort((a, b) => a.date.localeCompare(b.date));
        targetMuscles = groups[0].muscles;
        workoutName = groups[0].name;
        reasoning = `All muscle groups trained this week. ${workoutName} was trained longest ago — time to hit it again!`;
      }
    } else if (split === 'upper_lower') {
      const upperTrained = trainedMap['Chest'] || trainedMap['Back'] || trainedMap['Shoulders'];
      const lowerTrained = trainedMap['Legs'];
      if (!upperTrained || (upperTrained && lowerTrained && upperTrained < lowerTrained)) {
        targetMuscles = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
        workoutName = 'Upper Body';
        reasoning = 'Upper body day based on your upper/lower split rotation.';
      } else {
        targetMuscles = ['Legs', 'Core'];
        workoutName = 'Lower Body';
        reasoning = 'Lower body day — let\'s build those legs and core!';
      }
    } else if (split === 'full_body') {
      targetMuscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'];
      workoutName = 'Full Body';
      reasoning = 'Full body session — we\'ll hit every major muscle group!';
    } else {
      // Bro split — rotate through muscle groups
      const broOrder = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms'];
      const untrained = broOrder.filter(m => !trainedMap[m]);
      const target = untrained.length > 0 ? untrained[0] : broOrder[0];
      if (target === 'Arms') { targetMuscles = ['Biceps', 'Triceps']; }
      else { targetMuscles = [target]; }
      workoutName = `${target} Day`;
      reasoning = `Bro split rotation — ${target.toLowerCase()} is up next!`;
    }

    // Pick exercises for each target muscle (varied, no duplicates)
    const usedExerciseIds = new Set();
    const suggestedExercises = [];

    for (const muscle of targetMuscles) {
      // Get multiple exercises for this muscle group
      const exercisesForMuscle = db.prepare(
        'SELECT * FROM exercises WHERE muscle_group = ? ORDER BY RANDOM()'
      ).all(muscle);

      // Pick 2-3 exercises per primary muscle, 1-2 for secondary
      const isPrimaryMuscle = ['Chest', 'Back', 'Legs', 'Shoulders'].includes(muscle);
      const count = isPrimaryMuscle ? (expLevel === 'beginner' ? 2 : 3) : (expLevel === 'beginner' ? 1 : 2);

      let picked = 0;
      for (const ex of exercisesForMuscle) {
        if (picked >= count) break;
        if (usedExerciseIds.has(ex.id)) continue;
        usedExerciseIds.add(ex.id);

        const isCompound = ex.category === 'compound';
        const sr = isCompound ? setsReps.compound : setsReps.isolation;
        const lastPerf = getLastPerformance(ex.id);

        let suggestedWeight = 0;
        let note = '';
        if (lastPerf && lastPerf.weight > 0) {
          const completedWell = lastPerf.total_reps >= (sr.reps * sr.sets * 0.8);
          if (completedWell) {
            suggestedWeight = isCompound
              ? Math.round((lastPerf.weight + 2.5) * 2) / 2
              : Math.round((lastPerf.weight + 1) * 2) / 2;
            note = `Progressive overload! Last time: ${lastPerf.weight}kg × ${lastPerf.reps}. Try ${suggestedWeight}kg today.`;
          } else {
            suggestedWeight = lastPerf.weight;
            note = `Consolidate at ${lastPerf.weight}kg — focus on completing all reps with good form.`;
          }
        } else {
          // No history — suggest starting weights based on experience
          const startWeights = {
            beginner:     { compound: 20, isolation: 5 },
            intermediate: { compound: 40, isolation: 10 },
            advanced:     { compound: 60, isolation: 15 },
          };
          suggestedWeight = (startWeights[expLevel] || startWeights.intermediate)[isCompound ? 'compound' : 'isolation'];
          note = `No previous data — start with ${suggestedWeight}kg and adjust based on how it feels.`;
        }

        suggestedExercises.push({
          exercise_id: ex.id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          equipment: ex.equipment,
          suggested_sets: sr.sets,
          suggested_reps: sr.reps,
          suggested_weight_kg: suggestedWeight,
          last_performance: lastPerf && lastPerf.date ? { weight: lastPerf.weight, reps: lastPerf.reps, date: lastPerf.date } : null,
          progression_note: note,
        });
        picked++;
      }
    }

    res.json({
      workout_name: workoutName,
      exercises: suggestedExercises,
      reasoning,
      estimated_duration_min: suggestedExercises.length * 8 + 10,
      total_sets: suggestedExercises.reduce((sum, e) => sum + e.suggested_sets, 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════
// GET /diet-plan
// ═══════════════════════════════════════════
router.get('/diet-plan', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const ctx = getUserContext(userId);
    const dp = ctx.dietary_preference || 'non_veg';

    // Calculate targets if not set
    const weight = ctx.weight_kg || 75;
    const tdee = ctx.tdee || 2500;
    const goal = ctx.goal || 'maintain';

    let calTarget = ctx.daily_calorie_target;
    let proTarget = ctx.daily_protein_target;
    let carbTarget = ctx.daily_carbs_target;
    let fatTarget = ctx.daily_fat_target;

    if (!calTarget) {
      if (goal === 'bulk') { calTarget = tdee + 400; proTarget = weight * 2; carbTarget = weight * 4.5; fatTarget = weight * 1; }
      else if (goal === 'cut') { calTarget = tdee - 400; proTarget = weight * 2.2; carbTarget = weight * 2.5; fatTarget = weight * 0.8; }
      else { calTarget = tdee; proTarget = weight * 1.8; carbTarget = weight * 3.5; fatTarget = weight * 1; }
    }

    // Filter foods by dietary preference
    let query = 'SELECT * FROM food_items WHERE 1=1';
    if (dp === 'veg') {
      query += " AND category NOT IN ('Meat', 'Seafood') AND LOWER(name) NOT IN ('chicken breast', 'salmon', 'tuna (canned)')";
    } else if (dp === 'vegan') {
      query += " AND category NOT IN ('Meat', 'Seafood', 'Dairy') AND LOWER(name) NOT LIKE '%egg%' AND LOWER(name) NOT LIKE '%whey%' AND LOWER(name) NOT LIKE '%milk%'";
    } else if (dp === 'eggetarian') {
      query += " AND category NOT IN ('Meat', 'Seafood')";
    }
    const foods = db.prepare(query).all();

    // Build meal plan with calculated portions to hit targets
    const mealAlloc = { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snack: 0.15 };

    // Categorize foods for smart meal construction
    const byCategory = {};
    foods.forEach(f => {
      const cat = f.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(f);
    });

    // Shuffle helper
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

    // Pick foods for each meal with some intelligence
    const highProtein = foods.filter(f => f.protein_g > 15).sort((a, b) => b.protein_g - a.protein_g);
    const carbSources = foods.filter(f => f.carbs_g > 20).sort((a, b) => b.carbs_g - a.carbs_g);
    const fatSources = foods.filter(f => f.fat_g > 10 && f.protein_g < 15);
    const lightFoods = foods.filter(f => f.calories_per_100g < 100);

    function buildMeal(mealType, calShare) {
      const mealCalTarget = calTarget * calShare;
      const mealProTarget = proTarget * calShare;
      let foodPicks = [];

      if (mealType === 'breakfast') {
        const breakfastOptions = foods.filter(f =>
          ['oats', 'egg', 'banana', 'milk', 'yogurt', 'whey'].some(k => f.name.toLowerCase().includes(k))
        );
        foodPicks = shuffle(breakfastOptions).slice(0, 3);
        if (foodPicks.length < 2) foodPicks = shuffle(highProtein).slice(0, 2);
      } else if (mealType === 'lunch') {
        const protein = shuffle(highProtein).slice(0, 1);
        const carb = shuffle(carbSources.filter(f => !protein.find(p => p.id === f.id))).slice(0, 1);
        const veg = shuffle(lightFoods.filter(f => !protein.find(p => p.id === f.id) && !carb.find(c => c.id === f.id))).slice(0, 1);
        foodPicks = [...protein, ...carb, ...veg];
      } else if (mealType === 'dinner') {
        const protein = shuffle(highProtein).slice(0, 1);
        const carb = shuffle(carbSources.filter(f => !protein.find(p => p.id === f.id))).slice(0, 1);
        foodPicks = [...protein, ...carb];
      } else {
        foodPicks = shuffle([...highProtein.slice(0, 3), ...(fatSources || []).slice(0, 2)]).slice(0, 2);
      }

      // Calculate quantities to roughly hit calorie target for this meal
      const items = foodPicks.map(f => {
        let qty = Math.round(mealCalTarget / foodPicks.length / (f.calories_per_100g / 100));
        qty = Math.max(30, Math.min(qty, 300)); // clamp between 30g and 300g
        // Round to nearest 10
        qty = Math.round(qty / 10) * 10;
        const macros = calcMacros(f, qty);
        return {
          food_id: f.id,
          name: f.name,
          quantity_g: qty,
          ...macros,
        };
      });

      const totals = items.reduce((acc, i) => ({
        calories: acc.calories + i.calories,
        protein: Math.round((acc.protein + i.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + i.carbs) * 10) / 10,
        fat: Math.round((acc.fat + i.fat) * 10) / 10,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return { meal_type: mealType, foods: items, meal_totals: totals };
    }

    const meals = [
      buildMeal('breakfast', mealAlloc.breakfast),
      buildMeal('lunch', mealAlloc.lunch),
      buildMeal('dinner', mealAlloc.dinner),
      buildMeal('snack', mealAlloc.snack),
    ];

    const planTotals = meals.reduce((acc, m) => ({
      calories: acc.calories + m.meal_totals.calories,
      protein: Math.round((acc.protein + m.meal_totals.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + m.meal_totals.carbs) * 10) / 10,
      fat: Math.round((acc.fat + m.meal_totals.fat) * 10) / 10,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const goalLabels = { bulk: 'Bulking — calorie surplus for muscle growth', cut: 'Cutting — calorie deficit to lose fat', maintain: 'Maintenance — sustaining current physique' };

    res.json({
      daily_targets: { calories: Math.round(calTarget), protein: Math.round(proTarget), carbs: Math.round(carbTarget), fat: Math.round(fatTarget) },
      meals,
      plan_totals: planTotals,
      goal_context: goalLabels[goal] || 'Based on your targets',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════
// GET /progress-analysis
// ═══════════════════════════════════════════
router.get('/progress-analysis', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const ctx = getUserContext(userId);

    // Workout counts
    const thisMonth = db.prepare("SELECT COUNT(*) as c FROM workout_sessions WHERE date >= date('now', 'start of month') AND (user_id = ? OR user_id IS NULL)").get(userId).c;
    const lastMonth = db.prepare("SELECT COUNT(*) as c FROM workout_sessions WHERE date >= date('now', '-1 month', 'start of month') AND date < date('now', 'start of month') AND (user_id = ? OR user_id IS NULL)").get(userId).c;
    const workoutTrend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

    // Consistency
    const daysPerWeek = ctx.workout_days_per_week || 5;
    const weeksThisMonth = 4;
    const planned = daysPerWeek * weeksThisMonth;
    const consistencyPct = planned > 0 ? Math.min(100, Math.round((thisMonth / planned) * 100)) : 0;

    // Strength gains on big lifts
    const bigLifts = ['Barbell Bench Press', 'Barbell Squat', 'Deadlift', 'Overhead Press'];
    const strengthGains = bigLifts.map(liftName => {
      const exercise = db.prepare('SELECT id FROM exercises WHERE name = ?').get(liftName);
      if (!exercise) return { exercise: liftName, current_max: null, previous_max: null, gain: 0 };

      const currentMax = db.prepare(`
        SELECT MAX(sl.weight_kg) as max_weight
        FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id
        JOIN workout_sessions w ON el.session_id = w.id
        WHERE el.exercise_id = ? AND w.date >= date('now', '-30 days') AND sl.completed = 1
      `).get(exercise.id);

      const previousMax = db.prepare(`
        SELECT MAX(sl.weight_kg) as max_weight
        FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id
        JOIN workout_sessions w ON el.session_id = w.id
        WHERE el.exercise_id = ? AND w.date >= date('now', '-60 days') AND w.date < date('now', '-30 days') AND sl.completed = 1
      `).get(exercise.id);

      const curr = currentMax?.max_weight || 0;
      const prev = previousMax?.max_weight || 0;
      return { exercise: liftName, current_max: curr, previous_max: prev, gain: curr - prev };
    });

    // Volume trend
    const thisMonthVolume = db.prepare(`
      SELECT COALESCE(SUM(sl.weight_kg * sl.reps), 0) as vol
      FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= date('now', 'start of month') AND sl.completed = 1
    `).get().vol;

    const lastMonthVolume = db.prepare(`
      SELECT COALESCE(SUM(sl.weight_kg * sl.reps), 0) as vol
      FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= date('now', '-1 month', 'start of month') AND w.date < date('now', 'start of month') AND sl.completed = 1
    `).get().vol;

    const volumeTrendPct = lastMonthVolume > 0 ? Math.round(((thisMonthVolume - lastMonthVolume) / lastMonthVolume) * 100) : 0;

    // Body weight trend
    const latestWeight = db.prepare("SELECT weight_kg, date FROM body_metrics WHERE weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1").get();
    const monthAgoWeight = db.prepare("SELECT weight_kg, date FROM body_metrics WHERE weight_kg IS NOT NULL AND date <= date('now', '-30 days') ORDER BY date DESC LIMIT 1").get();
    const weightChange = (latestWeight && monthAgoWeight) ? Math.round((latestWeight.weight_kg - monthAgoWeight.weight_kg) * 10) / 10 : null;

    // Muscle group balance (sessions per muscle in last 14 days)
    const muscleFreq = db.prepare(`
      SELECT e.muscle_group, COUNT(DISTINCT w.id) as sessions
      FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN exercises e ON el.exercise_id = e.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= date('now', '-14 days') AND sl.completed = 1
      GROUP BY e.muscle_group
    `).all();

    const avgFreq = muscleFreq.length > 0 ? muscleFreq.reduce((s, m) => s + m.sessions, 0) / muscleFreq.length : 0;
    const overtrained = muscleFreq.filter(m => m.sessions > avgFreq * 1.5).map(m => m.muscle_group);
    const undertrained = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core']
      .filter(g => !muscleFreq.find(m => m.muscle_group === g));
    const balanced = muscleFreq.filter(m => m.sessions >= avgFreq * 0.5 && m.sessions <= avgFreq * 1.5).map(m => m.muscle_group);

    // Generate recommendations
    const recommendations = [];
    if (consistencyPct < 60) recommendations.push('Your workout consistency is below 60% — try to stick to your schedule more closely.');
    if (consistencyPct >= 90) recommendations.push('Excellent consistency! Keep up the great work! 💪');
    if (undertrained.length > 0) recommendations.push(`Consider training ${undertrained.join(', ')} more — these muscle groups are lagging behind.`);
    if (overtrained.length > 0) recommendations.push(`You might be overtraining ${overtrained.join(', ')} — ensure adequate recovery.`);
    if (volumeTrendPct > 20) recommendations.push('Training volume has increased significantly — make sure you\'re recovering properly.');
    if (volumeTrendPct < -10) recommendations.push('Training volume has dropped — try to maintain or gradually increase your workload.');
    strengthGains.filter(sg => sg.gain > 0).forEach(sg => recommendations.push(`Great progress on ${sg.exercise}: +${sg.gain}kg in the last month!`));
    if (recommendations.length === 0) recommendations.push('Keep training consistently and progressively overloading — results will follow!');

    res.json({
      summary: thisMonth > 0 ? `You've completed ${thisMonth} workouts this month${lastMonth > 0 ? ` (${workoutTrend > 0 ? '+' : ''}${workoutTrend}% vs last month)` : ''}.` : 'No workouts logged this month yet. Let\'s get started!',
      consistency_pct: consistencyPct,
      workout_trend_pct: workoutTrend,
      volume_trend: `${volumeTrendPct > 0 ? '+' : ''}${volumeTrendPct}%`,
      volume_this_month: thisMonthVolume,
      strength_gains: strengthGains,
      body_composition: weightChange !== null ? { weight_change: weightChange, current: latestWeight.weight_kg } : null,
      muscle_balance: { overtrained, undertrained, balanced },
      recommendations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════
// POST /ask — Smart Q&A
// ═══════════════════════════════════════════
router.post('/ask', (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const q = question.toLowerCase();
    const userId = req.user?.id || 1;
    const ctx = getUserContext(userId);
    let answer = '';
    let related_data = null;

    // ── Chest exercises ──
    if ((q.includes('chest') || q.includes('pec')) && (q.includes('exercise') || q.includes('best') || q.includes('workout'))) {
      const exercises = db.prepare("SELECT name, equipment FROM exercises WHERE muscle_group = 'Chest' ORDER BY category DESC").all();
      answer = `Here are the best chest exercises:\n\n${exercises.map((e, i) => `${i + 1}. **${e.name}** (${e.equipment})`).join('\n')}\n\nStart with compound movements like Bench Press, then move to isolation work like Flyes.`;
      related_data = exercises;
    }
    // ── Back exercises ──
    else if ((q.includes('back') || q.includes('lat')) && (q.includes('exercise') || q.includes('best') || q.includes('workout'))) {
      const exercises = db.prepare("SELECT name, equipment FROM exercises WHERE muscle_group = 'Back' ORDER BY category DESC").all();
      answer = `Here are the best back exercises:\n\n${exercises.map((e, i) => `${i + 1}. **${e.name}** (${e.equipment})`).join('\n')}\n\nDeadlifts and rows are king for back thickness, pull-ups for width.`;
      related_data = exercises;
    }
    // ── Leg exercises ──
    else if ((q.includes('leg') || q.includes('squat') || q.includes('quad') || q.includes('hamstring')) && (q.includes('exercise') || q.includes('best') || q.includes('workout'))) {
      const exercises = db.prepare("SELECT name, equipment FROM exercises WHERE muscle_group = 'Legs' ORDER BY category DESC").all();
      answer = `Here are the best leg exercises:\n\n${exercises.map((e, i) => `${i + 1}. **${e.name}** (${e.equipment})`).join('\n')}\n\nSquats are foundational — pair them with Romanian Deadlifts for balanced development.`;
      related_data = exercises;
    }
    // ── Shoulder exercises ──
    else if ((q.includes('shoulder') || q.includes('delt')) && (q.includes('exercise') || q.includes('best') || q.includes('workout'))) {
      const exercises = db.prepare("SELECT name, equipment FROM exercises WHERE muscle_group = 'Shoulders'").all();
      answer = `Here are the best shoulder exercises:\n\n${exercises.map((e, i) => `${i + 1}. **${e.name}** (${e.equipment})`).join('\n')}\n\nOverhead Press for overall mass, Lateral Raises for width.`;
      related_data = exercises;
    }
    // ── Arm exercises ──
    else if ((q.includes('arm') || q.includes('bicep') || q.includes('tricep')) && (q.includes('exercise') || q.includes('best') || q.includes('workout'))) {
      const biceps = db.prepare("SELECT name FROM exercises WHERE muscle_group = 'Biceps'").all();
      const triceps = db.prepare("SELECT name FROM exercises WHERE muscle_group = 'Triceps'").all();
      answer = `**Biceps:**\n${biceps.map((e, i) => `${i + 1}. ${e.name}`).join('\n')}\n\n**Triceps:**\n${triceps.map((e, i) => `${i + 1}. ${e.name}`).join('\n')}\n\nTriceps make up 2/3 of your arm — don't neglect them! Compound pushing movements work triceps too.`;
    }
    // ── Diet / nutrition ──
    else if (q.includes('diet') || q.includes('food') || q.includes('eat') || q.includes('nutrition') || q.includes('calorie') || q.includes('macro')) {
      const goalAdvice = {
        bulk: `You're bulking — aim for ${Math.round((ctx.tdee || 2500) + 400)} calories/day with at least ${Math.round((ctx.weight_kg || 75) * 2)}g protein. Focus on calorie-dense whole foods: rice, oats, eggs, chicken, paneer, and nuts.`,
        cut: `You're cutting — aim for ${Math.round((ctx.tdee || 2500) - 400)} calories/day with at least ${Math.round((ctx.weight_kg || 75) * 2.2)}g protein to preserve muscle. Prioritize protein-rich foods and vegetables to stay full.`,
        maintain: `You're maintaining — aim for ~${ctx.tdee || 2500} calories/day with ${Math.round((ctx.weight_kg || 75) * 1.8)}g protein. Balance your meals across the day and don't skip post-workout nutrition.`,
      };
      answer = goalAdvice[ctx.goal] || goalAdvice.maintain;
      answer += '\n\n**Key tips:**\n- Eat protein with every meal\n- Don\'t fear carbs — they fuel your workouts\n- Healthy fats support hormone production\n- Stay hydrated (3+ liters/day)';
    }
    // ── Protein ──
    else if (q.includes('protein') || q.includes('how much protein')) {
      const pTarget = Math.round((ctx.weight_kg || 75) * 2);
      answer = `At ${ctx.weight_kg || 75}kg, you should aim for **${pTarget}g of protein per day** (2g per kg of body weight).\n\n**Top protein sources per 100g:**\n1. Chicken Breast — 31g\n2. Whey Protein (scoop) — 24g/30g\n3. Tuna — 25.5g\n4. Paneer — 18.3g\n5. Eggs — 13g\n6. Greek Yogurt — 10g`;
    }
    // ── Rest / recovery ──
    else if (q.includes('rest') && (q.includes('between') || q.includes('set') || q.includes('time'))) {
      answer = `**Rest periods between sets:**\n\n- **Strength (1-5 reps):** 3-5 minutes\n- **Hypertrophy (6-12 reps):** 60-90 seconds\n- **Endurance (12+ reps):** 30-60 seconds\n- **Compound lifts:** Longer rest (2-3 min)\n- **Isolation:** Shorter rest (60-90s)\n\nYour current default rest timer is set to ${ctx.rest_timer_default || 90} seconds.`;
    }
    // ── Sleep ──
    else if (q.includes('sleep') || q.includes('recovery')) {
      answer = `**Sleep & Recovery Guidelines:**\n\n- Aim for **7-9 hours** of quality sleep per night\n- Sleep is when muscle repair and growth hormone release peaks\n- Avoid screens 1 hour before bed\n- Keep your room cool (18-20°C)\n- Consistent sleep schedule matters more than total hours\n- Take 1-2 rest days per week\n- Active recovery (walking, stretching) on rest days helps`;
    }
    // ── Plateau ──
    else if (q.includes('plateau') || q.includes('stuck') || q.includes('not progressing') || q.includes('stall')) {
      answer = `**Breaking Through a Plateau:**\n\n1. **Deload week** — Reduce volume by 40-50% for a week to recover\n2. **Change rep ranges** — If doing 3×8, try 5×5 or 4×12\n3. **Technique tweaks** — Pause reps, tempo training, 1.5 reps\n4. **Drop sets** — After your last set, reduce weight 20% and go to failure\n5. **Increase frequency** — Hit the muscle 2-3× per week instead of once\n6. **Eat more** — Plateaus during a cut are common; consider a diet break\n7. **Sleep more** — Poor recovery = poor progress`;
    }
    // ── Supplements ──
    else if (q.includes('supplement') || q.includes('creatine') || q.includes('pre workout')) {
      answer = `**Evidence-Based Supplements:**\n\n🥇 **Tier 1 (Must-have):**\n- Creatine Monohydrate — 5g/day, proven for strength & size\n- Whey Protein — Convenient way to hit protein targets\n\n🥈 **Tier 2 (Nice-to-have):**\n- Caffeine — 200-400mg pre-workout for performance\n- Vitamin D3 — If you don't get enough sun\n- Fish Oil — 2-3g/day for joint health\n\n🥉 **Tier 3 (Optional):**\n- Ashwagandha — Stress reduction, minor testosterone support\n- Magnesium — Improves sleep quality\n\n❌ **Skip:** Most fat burners, BCAAs (whey has them), testosterone boosters`;
    }
    // ── Overtraining ──
    else if (q.includes('overtrain') || q.includes('too much') || q.includes('burnout')) {
      answer = `**Signs of Overtraining:**\n- Persistent fatigue\n- Declining performance\n- Increased injuries\n- Poor sleep despite being tired\n- Loss of motivation\n\n**Fix it:**\n1. Take a full rest week\n2. Reduce training volume by 30%\n3. Prioritize sleep (8+ hours)\n4. Eat at maintenance calories\n5. Manage stress outside the gym`;
    }
    // ── Warm up ──
    else if (q.includes('warm up') || q.includes('warmup')) {
      answer = `**Proper Warm-Up Protocol:**\n\n1. **5 min light cardio** — Jumping jacks, cycling, or brisk walk\n2. **Dynamic stretches** — Arm circles, leg swings, hip rotations\n3. **Activation work** — Band pull-aparts, glute bridges\n4. **Ramp-up sets:**\n   - Set 1: 50% working weight × 10 reps\n   - Set 2: 70% working weight × 5 reps\n   - Set 3: 85% working weight × 3 reps\n   - Then begin working sets\n\nNever skip warm-up — it prevents injuries and improves performance!`;
    }
    // ── Motivation ──
    else if (q.includes('motivat') || q.includes('discipline') || q.includes('consistent')) {
      const quotes = [
        'Discipline is choosing between what you want now and what you want most.',
        'The only bad workout is the one that didn\'t happen.',
        'Success isn\'t given. It\'s earned — in the gym, at work, and everywhere else.',
        'Your body can stand almost anything. It\'s your mind you have to convince.',
      ];
      answer = `💪 **"${quotes[Math.floor(Math.random() * quotes.length)]}"**\n\n**Tips for staying consistent:**\n1. Set specific, measurable goals\n2. Track everything (that's what this app is for!)\n3. Find a workout partner or community\n4. Remember: motivation fades, discipline stays\n5. Start small — even 20 minutes counts\n6. Celebrate small wins and PRs`;
    }
    // ── Default ──
    else {
      answer = `Great question! Here are some general tips:\n\n1. **Train consistently** — ${ctx.workout_days_per_week || 5} days per week on your ${ctx.preferred_split || 'PPL'} split\n2. **Progressive overload** — Add weight or reps each session\n3. **Hit your protein** — ${Math.round((ctx.weight_kg || 75) * 2)}g per day minimum\n4. **Sleep 7-9 hours** — Recovery is where growth happens\n5. **Track everything** — What gets measured gets managed\n\nTry asking me about specific exercises, diet plans, plateaus, supplements, or recovery!`;
    }

    res.json({ answer, related_data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
