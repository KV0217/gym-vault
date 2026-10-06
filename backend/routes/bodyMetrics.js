import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { from, to } = req.query;

    let query = 'SELECT * FROM body_metrics WHERE (user_id = ? OR user_id IS NULL)';
    const params = [userId];

    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }

    query += ' ORDER BY date DESC LIMIT ?';
    params.push(limit);

    const metrics = db.prepare(query).all(...params);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/latest', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const metric = db.prepare('SELECT * FROM body_metrics WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC LIMIT 1').get(userId);
    res.json(metric || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO body_metrics (date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      date || new Date().toISOString().split('T')[0],
      weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes, userId
    );
    
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM body_metrics WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
