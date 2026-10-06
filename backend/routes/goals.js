import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const goals = db.prepare('SELECT * FROM goals WHERE (user_id = ? OR user_id IS NULL) ORDER BY completed ASC, created_at DESC').all(userId);
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { title, type, target_value, unit, exercise_id, deadline, notes } = req.body;
    const stmt = db.prepare('INSERT INTO goals (title, type, target_value, unit, exercise_id, deadline, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(title, type, target_value, unit, exercise_id, deadline, notes, userId);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { title, target_value, current_value, deadline, completed, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE goals
      SET title = COALESCE(?, title),
          target_value = COALESCE(?, target_value),
          current_value = COALESCE(?, current_value),
          deadline = COALESCE(?, deadline),
          completed = COALESCE(?, completed),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `);
    stmt.run(title, target_value, current_value, deadline, completed, notes, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/progress', (req, res) => {
  try {
    const { current_value } = req.body;
    db.prepare('UPDATE goals SET current_value = ? WHERE id = ?').run(current_value, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-auto', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const goals = db.prepare('SELECT * FROM goals WHERE completed = 0 AND (user_id = ? OR user_id IS NULL)').all(userId);
    let updated = 0;

    for (const g of goals) {
      if (g.type === 'weight') {
        const latestWeight = db.prepare('SELECT weight_kg FROM body_metrics WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC LIMIT 1').get(userId);
        if (latestWeight) {
          let comp = 0;
          if (g.target_value > g.current_value && latestWeight.weight_kg >= g.target_value) comp = 1;
          if (g.target_value < g.current_value && latestWeight.weight_kg <= g.target_value) comp = 1;
          db.prepare('UPDATE goals SET current_value = ?, completed = ? WHERE id = ?').run(latestWeight.weight_kg, comp, g.id);
          if(latestWeight.weight_kg !== g.current_value) updated++;
        }
      } else if (g.type === 'strength' && g.exercise_id) {
        const latestMax = db.prepare(`
          SELECT MAX(sl.weight_kg) as max_w 
          FROM set_logs sl 
          JOIN exercise_logs el ON sl.exercise_log_id = el.id 
          JOIN workout_sessions w ON el.session_id = w.id
          WHERE el.exercise_id = ? AND sl.completed = 1 AND (w.user_id = ? OR w.user_id IS NULL)
        `).get(g.exercise_id, userId);
        
        if (latestMax && latestMax.max_w) {
          const comp = latestMax.max_w >= g.target_value ? 1 : 0;
          db.prepare('UPDATE goals SET current_value = ?, completed = ? WHERE id = ?').run(latestMax.max_w, comp, g.id);
          if(latestMax.max_w !== g.current_value) updated++;
        }
      }
    }
    res.json({ success: true, updated_goals: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
