import db from '../db/init.js';

export function getSmartInsights(userId = 1) {
  const insights = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Check muscle groups
  const lastWorkouts = db.prepare(`
    SELECT e.muscle_group, MAX(w.date) as last_trained
    FROM set_logs sl
    JOIN exercise_logs el ON sl.exercise_log_id = el.id
    JOIN exercises e ON el.exercise_id = e.id
    JOIN workout_sessions w ON el.session_id = w.id
    WHERE sl.completed = 1 AND (w.user_id = ? OR w.user_id IS NULL)
    GROUP BY e.muscle_group
  `).all(userId);

  for (const group of lastWorkouts) {
    if (!group.last_trained) continue;
    const daysSince = Math.floor((new Date() - new Date(group.last_trained)) / (1000 * 60 * 60 * 24));
    if (daysSince >= 5) {
      insights.push({
        type: 'training',
        title: 'Muscle Group Neglected',
        message: `You haven't trained ${group.muscle_group} in ${daysSince} days`,
        priority: 'high',
        icon: 'warning'
      });
    }
  }

  // 2. Check protein intake
  const proteinStats = db.prepare(`
    SELECT SUM(f.protein_g * mfe.quantity_g / 100) as daily_protein
    FROM meal_logs ml
    JOIN meal_food_entries mfe ON ml.id = mfe.meal_log_id
    JOIN food_items f ON mfe.food_item_id = f.id
    WHERE ml.date >= date('now', '-7 days') AND (ml.user_id = ? OR ml.user_id IS NULL)
    GROUP BY ml.date
  `).all(userId);
  
  const prefs = db.prepare('SELECT daily_protein_target, water_target_ml, daily_calorie_target FROM user_preferences WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId) || {};
  
  if (prefs.daily_protein_target && proteinStats.length > 0) {
    const avgProtein = proteinStats.reduce((sum, s) => sum + s.daily_protein, 0) / proteinStats.length;
    if (avgProtein < prefs.daily_protein_target * 0.9) {
      const pct = Math.round((1 - avgProtein / prefs.daily_protein_target) * 100);
      insights.push({
        type: 'nutrition',
        title: 'Protein Intake Low',
        message: `Your protein intake is ${pct}% below target (last 7 days avg)`,
        priority: 'high',
        icon: 'warning'
      });
    }
  }

  // 3. Check plateaus
  const plateauCheck = db.prepare(`
    SELECT e.name, w.date, MAX(sl.weight_kg) as max_weight
    FROM set_logs sl
    JOIN exercise_logs el ON sl.exercise_log_id = el.id
    JOIN exercises e ON el.exercise_id = e.id
    JOIN workout_sessions w ON el.session_id = w.id
    WHERE sl.completed = 1 AND (w.user_id = ? OR w.user_id IS NULL)
    GROUP BY e.id, w.id
    ORDER BY w.date DESC
  `).all(userId);
  const exHistory = {};
  for (const p of plateauCheck) {
    if (!exHistory[p.name]) exHistory[p.name] = [];
    exHistory[p.name].push(p.max_weight);
  }
  for (const [exName, weights] of Object.entries(exHistory)) {
    if (weights.length >= 3) {
      if (weights[0] === weights[1] && weights[1] === weights[2]) {
        insights.push({
          type: 'training',
          title: 'Plateau Detected',
          message: `Plateau detected on ${exName} - try drop sets or pause reps`,
          priority: 'normal',
          icon: 'trending_flat'
        });
      }
    }
  }

  // 4. Check PRs
  const prsCount = db.prepare(`
    SELECT COUNT(*) as prs
    FROM set_logs sl
    JOIN exercise_logs el ON sl.exercise_log_id = el.id
    JOIN workout_sessions w ON el.session_id = w.id
    WHERE sl.is_pr = 1 AND w.date >= date('now', '-7 days') AND (w.user_id = ? OR w.user_id IS NULL)
  `).get(userId).prs;
  if (prsCount > 0) {
    insights.push({
      type: 'achievement',
      title: 'PR Streak',
      message: `Amazing! ${prsCount} new PRs this week! 🏆`,
      priority: 'high',
      icon: 'emoji_events'
    });
  }

  // 5. Workout consistency
  const workoutsLast7 = db.prepare(`
    SELECT COUNT(*) as count FROM workout_sessions WHERE date >= date('now', '-7 days') AND (user_id = ? OR user_id IS NULL)
  `).get(userId).count;
  const planDays = prefs.workout_days_per_week || 5;
  if (workoutsLast7 < planDays) {
    insights.push({
      type: 'training',
      title: 'Missed Workouts',
      message: `You missed ${planDays - workoutsLast7} planned workouts this week`,
      priority: 'normal',
      icon: 'info'
    });
  } else if (workoutsLast7 >= planDays && workoutsLast7 > 0) {
    insights.push({
      type: 'achievement',
      title: 'Consistency',
      message: `You're on track with your workouts! Keep it up!`,
      priority: 'normal',
      icon: 'check_circle'
    });
  }

  // 6. Deload check
  const lastDeload = db.prepare(`
    SELECT MAX(date) as last_date FROM workout_sessions WHERE name LIKE '%deload%' AND (user_id = ? OR user_id IS NULL)
  `).get(userId).last_date;
  const firstWorkout = db.prepare(`SELECT MIN(date) as first_date FROM workout_sessions WHERE (user_id = ? OR user_id IS NULL)`).get(userId).first_date;
  
  const referenceDate = lastDeload ? new Date(lastDeload) : (firstWorkout ? new Date(firstWorkout) : null);
  if (referenceDate) {
    const weeksSince = Math.floor((new Date() - referenceDate) / (1000 * 60 * 60 * 24 * 7));
    if (weeksSince >= 4) {
      insights.push({
        type: 'recovery',
        title: 'Deload Recommended',
        message: 'Consider a deload week to aid recovery',
        priority: 'normal',
        icon: 'bed'
      });
    }
  }

  // 7. Water intake
  const todayDateStr = new Date().toISOString().split('T')[0];
  const waterToday = db.prepare(`SELECT SUM(amount_ml) as total FROM water_logs WHERE date = ? AND (user_id = ? OR user_id IS NULL)`).get(todayDateStr, userId).total || 0;
  if (prefs.water_target_ml) {
    if (waterToday > 0 && waterToday < prefs.water_target_ml) {
      insights.push({
        type: 'nutrition',
        title: 'Hydration',
        message: `You've had ${waterToday}ml water today - aim for ${prefs.water_target_ml}ml`,
        priority: 'normal',
        icon: 'water_drop'
      });
    }
  }

  // 8. Sleep quality
  const sleepAvg = db.prepare(`SELECT AVG(quality) as avg_q FROM sleep_logs WHERE date >= date('now', '-7 days') AND (user_id = ? OR user_id IS NULL)`).get(userId).avg_q;
  if (sleepAvg && sleepAvg < 3) {
    insights.push({
      type: 'recovery',
      title: 'Poor Sleep',
      message: 'Your sleep quality has been low - this may affect recovery',
      priority: 'high',
      icon: 'bedtime'
    });
  }

  // 9. Calorie check
  const calToday = db.prepare(`
    SELECT SUM(f.calories_per_100g * mfe.quantity_g / 100) as total
    FROM meal_logs ml
    JOIN meal_food_entries mfe ON ml.id = mfe.meal_log_id
    JOIN food_items f ON mfe.food_item_id = f.id
    WHERE ml.date = ? AND (ml.user_id = ? OR ml.user_id IS NULL)
  `).get(todayDateStr, userId).total || 0;
  if (prefs.daily_calorie_target && calToday > 0) {
    const diff = calToday - prefs.daily_calorie_target;
    if (Math.abs(diff) > 200) {
      insights.push({
        type: 'nutrition',
        title: 'Calorie Target',
        message: `You're ${diff > 0 ? 'over' : 'under'} your calorie target by ${Math.abs(Math.round(diff))} cal/day`,
        priority: 'normal',
        icon: 'restaurant'
      });
    }
  }

  insights.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  return { insights: insights.slice(0, 5) };
}
