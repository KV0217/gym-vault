import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { muscle_group, category, search } = req.query;
    let query = 'SELECT * FROM exercises WHERE 1=1';
    const params = [];

    if (muscle_group) {
      query += ' AND muscle_group = ?';
      params.push(muscle_group);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    const exercises = db.prepare(query).all(...params);
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, category, muscle_group, secondary_muscles, equipment, instructions } = req.body;
    const stmt = db.prepare(`
      INSERT INTO exercises (name, category, muscle_group, secondary_muscles, equipment, instructions, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(name, category, muscle_group, secondary_muscles, equipment, instructions);
    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
