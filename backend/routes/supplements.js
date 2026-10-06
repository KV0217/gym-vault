import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date } = req.query;
    let query = 'SELECT * FROM supplement_logs WHERE (user_id = ? OR user_id IS NULL)';
    const params = [userId];
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/routine', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const routine = db.prepare(`
      SELECT name, COUNT(*) as count 
      FROM supplement_logs 
      WHERE (user_id = ? OR user_id IS NULL)
      GROUP BY name 
      HAVING count >= 3 
      ORDER BY count DESC
    `).all(userId);
    res.json(routine.map(r => r.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, name, dosage, time_taken } = req.body;
    const stmt = db.prepare('INSERT INTO supplement_logs (date, name, dosage, time_taken, user_id) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(date || new Date().toISOString().split('T')[0], name, dosage, time_taken, userId);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, supplements } = req.body;
    db.transaction(() => {
      const stmt = db.prepare('INSERT INTO supplement_logs (date, name, dosage, time_taken, user_id) VALUES (?, ?, ?, ?, ?)');
      for (const supp of supplements) {
        stmt.run(date || new Date().toISOString().split('T')[0], supp.name, supp.dosage, supp.time_taken, userId);
      }
    })();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM supplement_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
