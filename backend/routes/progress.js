import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/exercise/:exerciseId', (req, res) => {
  try {
    const exerciseId = req.params.exerciseId;
    
    const progressData = db.prepare(`
      SELECT w.date, MAX(sl.weight_kg) as max_weight, MAX(sl.reps) as max_reps
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE el.exercise_id = ? AND sl.completed = 1
      GROUP BY w.date
      ORDER BY w.date ASC
    `).all(exerciseId);

    // Calculate Epley 1RM: weight × (1 + reps/30)
    const result = progressData.map(row => {
      const estimated_1rm = row.max_weight * (1 + (row.max_reps / 30));
      return {
        ...row,
        estimated_1rm: parseFloat(estimated_1rm.toFixed(2))
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/volume-weekly', (req, res) => {
  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const dateStr = eightWeeksAgo.toISOString().split('T')[0];

    const volumeData = db.prepare(`
      SELECT strftime('%Y-%W', w.date) as week, e.muscle_group, SUM(sl.weight_kg * sl.reps) as volume
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN exercises e ON el.exercise_id = e.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= ? AND sl.completed = 1
      GROUP BY week, e.muscle_group
      ORDER BY week ASC
    `).all(dateStr);

    res.json(volumeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', (req, res) => {
  try {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const totalWorkouts = db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE date >= ?').get(firstDayOfMonth).count;
    
    const totalVolume = db.prepare(`
      SELECT SUM(sl.weight_kg * sl.reps) as vol
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= ? AND sl.completed = 1
    `).get(firstDayOfMonth).vol;

    const prsHit = db.prepare(`
      SELECT COUNT(*) as count
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE w.date >= ? AND sl.is_pr = 1
    `).get(firstDayOfMonth).count;

    const avgDuration = db.prepare('SELECT AVG(duration_min) as avg_dur FROM workout_sessions WHERE date >= ? AND duration_min IS NOT NULL').get(firstDayOfMonth).avg_dur;

    res.json({
      totalWorkouts,
      totalVolume: totalVolume || 0,
      prsHit,
      avgWorkoutDuration: avgDuration ? parseFloat(avgDuration.toFixed(1)) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
