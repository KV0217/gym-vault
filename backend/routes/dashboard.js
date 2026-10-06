import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const today = new Date().toISOString().split('T')[0];
    
    // Today's workout summary
    const todayWorkout = db.prepare('SELECT * FROM workout_sessions WHERE date = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1').get(today, userId);
    
    // Weekly workout count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const weeklyCount = db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE date >= ? AND (user_id = ? OR user_id IS NULL)').get(weekAgoStr, userId).count;
    
    // Streak
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasWorkout = db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE date = ? AND (user_id = ? OR user_id IS NULL)').get(dateStr, userId).count;
      if (hasWorkout > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && dateStr === today) {
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Today's nutrition
    const nutrition = db.prepare(`
      SELECT 
        SUM((f.calories_per_100g * mfe.quantity_g) / 100) as calories,
        SUM((f.protein_g * mfe.quantity_g) / 100) as protein,
        SUM((f.carbs_g * mfe.quantity_g) / 100) as carbs,
        SUM((f.fat_g * mfe.quantity_g) / 100) as fat
      FROM meal_logs ml
      JOIN meal_food_entries mfe ON ml.id = mfe.meal_log_id
      JOIN food_items f ON mfe.food_item_id = f.id
      WHERE ml.date = ? AND (ml.user_id = ? OR ml.user_id IS NULL)
    `).get(today, userId);

    // Latest body weight
    const latestMetric = db.prepare('SELECT weight_kg FROM body_metrics WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC LIMIT 1').get(userId);

    // Recent PRs
    const recentPRs = db.prepare(`
      SELECT sl.*, e.name as exercise_name, w.date
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN exercises e ON el.exercise_id = e.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE sl.is_pr = 1 AND (w.user_id = ? OR w.user_id IS NULL)
      ORDER BY w.date DESC, sl.created_at DESC
      LIMIT 5
    `).all(userId);

    // Workouts this month
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const monthWorkouts = db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE date >= ? AND (user_id = ? OR user_id IS NULL)').get(firstDayOfMonth, userId).count;

    // AI Insights
    let ai_insights = [];
    try {
      const { getSmartInsights } = await import('../utils/aiEngine.js');
      ai_insights = getSmartInsights(userId).insights.slice(0, 3);
    } catch {
      ai_insights = [
        { type: 'streak', title: 'Consistency Check', message: 'Log your training today to keep the momentum going!', priority: 'normal', icon: 'zap' }
      ];
    }

    // Goals
    const goals = db.prepare('SELECT * FROM goals WHERE completed = 0 AND (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC').all(userId);
    const goalsWithProgress = goals.map(g => ({
      ...g,
      progress_percentage: g.target_value !== 0 ? Math.min(100, Math.max(0, (g.current_value / g.target_value) * 100)) : 0
    }));

    // Sleep last night
    const sleep_last_night = db.prepare('SELECT * FROM sleep_logs WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC LIMIT 1').get(userId) || null;

    // Supplements today
    const supplements_today = db.prepare('SELECT * FROM supplement_logs WHERE date = ? AND (user_id = ? OR user_id IS NULL)').all(today, userId);

    // Targets
    const prefs = db.prepare('SELECT daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target FROM user_preferences WHERE user_id = ? OR id = ? LIMIT 1').get(userId, userId) || {};

    res.json({
      todayWorkout: todayWorkout || null,
      weeklyWorkoutCount: weeklyCount,
      streak,
      todayNutrition: {
        calories: nutrition ? nutrition.calories || 0 : 0,
        protein: nutrition ? nutrition.protein || 0 : 0,
        carbs: nutrition ? nutrition.carbs || 0 : 0,
        fat: nutrition ? nutrition.fat || 0 : 0
      },
      latestWeightKg: latestMetric ? latestMetric.weight_kg : null,
      recentPRs,
      monthWorkouts,
      ai_insights,
      goals: goalsWithProgress,
      sleep_last_night,
      supplements_today,
      calorie_target: prefs.daily_calorie_target || 0,
      macro_targets: {
        protein: prefs.daily_protein_target || 0,
        carbs: prefs.daily_carbs_target || 0,
        fat: prefs.daily_fat_target || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
