import express from 'express';
import db from '../db/init.js';

const router = express.Router();

function checkAndMarkPR(exerciseId, weight, reps, setId, userId = 1) {
  if (weight <= 0) return 0;
  // Get max weight for this exercise for this user
  const maxPrev = db.prepare(`
    SELECT MAX(weight_kg) as maxWeight
    FROM set_logs sl
    JOIN exercise_logs el ON sl.exercise_log_id = el.id
    JOIN workout_sessions w ON el.session_id = w.id
    WHERE el.exercise_id = ? AND sl.id != ? AND sl.completed = 1 AND (w.user_id = ? OR w.user_id IS NULL)
  `).get(exerciseId, setId || -1, userId);

  if (!maxPrev || maxPrev.maxWeight == null || weight > maxPrev.maxWeight) {
    return 1;
  }
  return 0;
}

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const sessions = db.prepare(`
      SELECT w.*, 
             (SELECT COUNT(*) FROM exercise_logs WHERE session_id = w.id) as exercise_count,
             (SELECT SUM(weight_kg * reps) FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id WHERE el.session_id = w.id) as total_volume
      FROM workout_sessions w
      WHERE w.user_id = ? OR w.user_id IS NULL
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const exerciseLogs = db.prepare(`
      SELECT el.*, e.name as exercise_name, e.category 
      FROM exercise_logs el
      JOIN exercises e ON el.exercise_id = e.id
      WHERE el.session_id = ?
      ORDER BY el.order_index ASC
    `).all(session.id);

    for (let el of exerciseLogs) {
      el.sets = db.prepare('SELECT * FROM set_logs WHERE exercise_log_id = ? ORDER BY set_number ASC').all(el.id);
    }

    session.exercises = exerciseLogs;
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { name, date, notes } = req.body;
    const stmt = db.prepare('INSERT INTO workout_sessions (name, date, notes, user_id) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, date || new Date().toISOString().split('T')[0], notes, userId);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, notes, duration_min, completed } = req.body;
    const stmt = db.prepare(`
      UPDATE workout_sessions
      SET name = COALESCE(?, name),
          notes = COALESCE(?, notes),
          duration_min = COALESCE(?, duration_min),
          completed = COALESCE(?, completed)
      WHERE id = ?
    `);
    stmt.run(name, notes, duration_min, completed, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM workout_sessions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/exercises', (req, res) => {
  try {
    const { exercise_id, order_index } = req.body;
    const stmt = db.prepare('INSERT INTO exercise_logs (session_id, exercise_id, order_index) VALUES (?, ?, ?)');
    const info = stmt.run(req.params.id, exercise_id, order_index || 0);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/exercise-logs/:exerciseLogId', (req, res) => {
  try {
    db.prepare('DELETE FROM exercise_logs WHERE id = ?').run(req.params.exerciseLogId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/exercise-logs/:exerciseLogId/sets', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    let { set_number, weight_kg, reps, rpe, is_warmup } = req.body;
    weight_kg = weight_kg || 0;
    reps = reps || 0;
    
    // Get exerciseId to check PR
    const exLog = db.prepare('SELECT exercise_id FROM exercise_logs WHERE id = ?').get(req.params.exerciseLogId);
    let is_pr = 0;
    
    if (exLog && !is_warmup) {
      is_pr = checkAndMarkPR(exLog.exercise_id, weight_kg, reps, null, userId);
    }

    const stmt = db.prepare(`
      INSERT INTO set_logs (exercise_log_id, set_number, weight_kg, reps, rpe, is_warmup, is_pr)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.params.exerciseLogId, set_number, weight_kg, reps, rpe, is_warmup ? 1 : 0, is_pr);
    res.status(201).json({ id: info.lastInsertRowid, is_pr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sets/:setId', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const setId = req.params.setId;
    const { weight_kg, reps, rpe, is_warmup, completed } = req.body;
    
    const setLog = db.prepare('SELECT sl.*, el.exercise_id FROM set_logs sl JOIN exercise_logs el ON sl.exercise_log_id = el.id WHERE sl.id = ?').get(setId);
    
    if (!setLog) return res.status(404).json({ error: 'Set not found' });

    const newWeight = weight_kg !== undefined ? weight_kg : setLog.weight_kg;
    const newReps = reps !== undefined ? reps : setLog.reps;
    const newIsWarmup = is_warmup !== undefined ? is_warmup : setLog.is_warmup;
    
    let is_pr = 0;
    if (!newIsWarmup) {
      is_pr = checkAndMarkPR(setLog.exercise_id, newWeight, newReps, setId, userId);
    }

    const stmt = db.prepare(`
      UPDATE set_logs
      SET weight_kg = COALESCE(?, weight_kg),
          reps = COALESCE(?, reps),
          rpe = COALESCE(?, rpe),
          is_warmup = COALESCE(?, is_warmup),
          completed = COALESCE(?, completed),
          is_pr = ?
      WHERE id = ?
    `);
    stmt.run(weight_kg, reps, rpe, is_warmup, completed, is_pr, setId);
    res.json({ success: true, is_pr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sets/:setId', (req, res) => {
  try {
    db.prepare('DELETE FROM set_logs WHERE id = ?').run(req.params.setId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/personal-records/:exerciseId', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const prs = db.prepare(`
      SELECT sl.*, w.date
      FROM set_logs sl
      JOIN exercise_logs el ON sl.exercise_log_id = el.id
      JOIN workout_sessions w ON el.session_id = w.id
      WHERE el.exercise_id = ? AND sl.is_pr = 1 AND (w.user_id = ? OR w.user_id IS NULL)
      ORDER BY w.date DESC, sl.weight_kg DESC
    `).all(req.params.exerciseId, userId);
    res.json(prs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
