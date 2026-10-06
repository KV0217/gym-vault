import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { from, to } = req.query;
    let query = 'SELECT * FROM sleep_logs WHERE (user_id = ? OR user_id IS NULL)';
    const params = [userId];
    if (from && to) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(from, to);
    }
    query += ' ORDER BY date DESC';
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const stats = db.prepare(`
      SELECT AVG(duration_hours) as avg_duration, AVG(quality) as avg_quality, COUNT(*) as total_logs 
      FROM sleep_logs 
      WHERE (user_id = ? OR user_id IS NULL) AND date >= date('now', '-30 days')
    `).get(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, bedtime, wake_time, duration_hours, quality, notes } = req.body;
    const stmt = db.prepare('INSERT INTO sleep_logs (date, bedtime, wake_time, duration_hours, quality, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(date || new Date().toISOString().split('T')[0], bedtime, wake_time, duration_hours, quality, notes, userId);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { bedtime, wake_time, duration_hours, quality, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE sleep_logs 
      SET bedtime = COALESCE(?, bedtime),
          wake_time = COALESCE(?, wake_time),
          duration_hours = COALESCE(?, duration_hours),
          quality = COALESCE(?, quality),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `);
    stmt.run(bedtime, wake_time, duration_hours, quality, notes, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sleep_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
