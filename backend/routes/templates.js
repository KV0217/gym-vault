import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM workout_templates').all();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const exercises = db.prepare(`
      SELECT te.*, e.name as exercise_name, e.category, e.muscle_group
      FROM template_exercises te
      JOIN exercises e ON te.exercise_id = e.id
      WHERE te.template_id = ?
      ORDER BY te.order_index ASC
    `).all(template.id);

    template.exercises = exercises;
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, description, category, exercises } = req.body;
    let templateId;

    db.transaction(() => {
      const stmt = db.prepare('INSERT INTO workout_templates (name, description, category) VALUES (?, ?, ?)');
      const info = stmt.run(name, description, category);
      templateId = info.lastInsertRowid;

      if (exercises && Array.isArray(exercises)) {
        const insertEx = db.prepare('INSERT INTO template_exercises (template_id, exercise_id, order_index, default_sets, default_reps) VALUES (?, ?, ?, ?, ?)');
        exercises.forEach((ex, idx) => {
          insertEx.run(templateId, ex.exercise_id, ex.order_index || idx, ex.default_sets || 3, ex.default_reps || 10);
        });
      }
    })();

    res.status(201).json({ id: templateId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM workout_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/start', (req, res) => {
  try {
    const templateId = req.params.id;
    let newSessionId;
    
    db.transaction(() => {
      const template = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(templateId);
      if (!template) throw new Error('Template not found');

      // Create session
      const insertSession = db.prepare('INSERT INTO workout_sessions (name, template_id, date) VALUES (?, ?, date("now"))');
      const sessionInfo = insertSession.run(template.name, template.id);
      newSessionId = sessionInfo.lastInsertRowid;

      // Get template exercises
      const tExercises = db.prepare('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY order_index ASC').all(templateId);
      
      const insertExLog = db.prepare('INSERT INTO exercise_logs (session_id, exercise_id, order_index) VALUES (?, ?, ?)');
      const insertSet = db.prepare('INSERT INTO set_logs (exercise_log_id, set_number, reps) VALUES (?, ?, ?)');

      tExercises.forEach((te, idx) => {
        const exLogInfo = insertExLog.run(newSessionId, te.exercise_id, te.order_index || idx);
        const exLogId = exLogInfo.lastInsertRowid;

        for (let i = 1; i <= te.default_sets; i++) {
          insertSet.run(exLogId, i, te.default_reps);
        }
      });
    })();

    res.status(201).json({ sessionId: newSessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
