import express from 'express';
import db from '../db/init.js';

const router = express.Router();

router.get('/foods', (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM food_items WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    const foods = db.prepare(query).all(...params);
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/foods', (req, res) => {
  try {
    const { name, category, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, serving_size_g, serving_unit } = req.body;
    const stmt = db.prepare(`
      INSERT INTO food_items (name, category, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, serving_size_g, serving_unit, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(name, category, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, serving_size_g || 100, serving_unit || 'g');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/meals', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const meals = db.prepare('SELECT * FROM meal_logs WHERE date = ? AND (user_id = ? OR user_id IS NULL)').all(date, userId);
    
    for (let meal of meals) {
      meal.entries = db.prepare(`
        SELECT mfe.*, f.name, f.calories_per_100g, f.protein_g, f.carbs_g, f.fat_g, f.fiber_g, f.serving_unit, f.serving_size_g
        FROM meal_food_entries mfe
        JOIN food_items f ON mfe.food_item_id = f.id
        WHERE mfe.meal_log_id = ?
      `).all(meal.id);
      
      meal.totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      meal.entries.forEach(entry => {
        const factor = entry.quantity_g / 100;
        meal.totals.calories += (entry.calories_per_100g * factor) || 0;
        meal.totals.protein += (entry.protein_g * factor) || 0;
        meal.totals.carbs += (entry.carbs_g * factor) || 0;
        meal.totals.fat += (entry.fat_g * factor) || 0;
      });
    }
    
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meals', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, meal_type, entries } = req.body;
    let mealId;
    
    db.transaction(() => {
      const stmt = db.prepare('INSERT INTO meal_logs (date, meal_type, user_id) VALUES (?, ?, ?)');
      const info = stmt.run(date || new Date().toISOString().split('T')[0], meal_type, userId);
      mealId = info.lastInsertRowid;
      
      if (entries && Array.isArray(entries)) {
        const insertEntry = db.prepare('INSERT INTO meal_food_entries (meal_log_id, food_item_id, quantity_g) VALUES (?, ?, ?)');
        entries.forEach(entry => {
          insertEntry.run(mealId, entry.food_item_id, entry.quantity_g);
        });
      }
    })();
    
    res.status(201).json({ id: mealId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/meals/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM meal_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-summary/:date', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const date = req.params.date;
    
    const summary = db.prepare(`
      SELECT 
        SUM((f.calories_per_100g * mfe.quantity_g) / 100) as total_calories,
        SUM((f.protein_g * mfe.quantity_g) / 100) as total_protein,
        SUM((f.carbs_g * mfe.quantity_g) / 100) as total_carbs,
        SUM((f.fat_g * mfe.quantity_g) / 100) as total_fat
      FROM meal_logs ml
      JOIN meal_food_entries mfe ON ml.id = mfe.meal_log_id
      JOIN food_items f ON mfe.food_item_id = f.id
      WHERE ml.date = ? AND (ml.user_id = ? OR ml.user_id IS NULL)
    `).get(date, userId);
    
    res.json({
      calories: summary.total_calories || 0,
      protein: summary.total_protein || 0,
      carbs: summary.total_carbs || 0,
      fat: summary.total_fat || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/water', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const waterLogs = db.prepare('SELECT * FROM water_logs WHERE date = ? AND (user_id = ? OR user_id IS NULL)').all(date, userId);
    
    const total = waterLogs.reduce((sum, log) => sum + log.amount_ml, 0);
    res.json({ logs: waterLogs, total_ml: total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/water', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { date, amount_ml } = req.body;
    const stmt = db.prepare('INSERT INTO water_logs (date, amount_ml, user_id) VALUES (?, ?, ?)');
    const info = stmt.run(date || new Date().toISOString().split('T')[0], amount_ml || 250, userId);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/meal-templates', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const templates = db.prepare('SELECT * FROM meal_templates WHERE (user_id = ? OR user_id IS NULL)').all(userId);
    for (let t of templates) {
      t.items = db.prepare(`
        SELECT mti.*, f.name, f.calories_per_100g, f.protein_g, f.carbs_g, f.fat_g, f.serving_unit, f.serving_size_g
        FROM meal_template_items mti
        JOIN food_items f ON mti.food_item_id = f.id
        WHERE mti.template_id = ?
      `).all(t.id);
    }
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meal-templates', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { name, meal_type, items } = req.body;
    let templateId;
    db.transaction(() => {
      const stmt = db.prepare('INSERT INTO meal_templates (name, meal_type, user_id) VALUES (?, ?, ?)');
      templateId = stmt.run(name, meal_type, userId).lastInsertRowid;
      
      if (items && Array.isArray(items)) {
        const insertItem = db.prepare('INSERT INTO meal_template_items (template_id, food_item_id, quantity_g) VALUES (?, ?, ?)');
        for (const item of items) {
          insertItem.run(templateId, item.food_item_id, item.quantity_g);
        }
      }
    })();
    res.status(201).json({ id: templateId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meal-templates/:id/use', (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const templateId = req.params.id;
    let mealId;
    db.transaction(() => {
      const template = db.prepare('SELECT * FROM meal_templates WHERE id = ?').get(templateId);
      if (!template) throw new Error('Template not found');
      
      const today = new Date().toISOString().split('T')[0];
      const stmt = db.prepare('INSERT INTO meal_logs (date, meal_type, user_id) VALUES (?, ?, ?)');
      mealId = stmt.run(today, template.meal_type, userId).lastInsertRowid;
      
      const items = db.prepare('SELECT * FROM meal_template_items WHERE template_id = ?').all(templateId);
      const insertEntry = db.prepare('INSERT INTO meal_food_entries (meal_log_id, food_item_id, quantity_g) VALUES (?, ?, ?)');
      for (const item of items) {
        insertEntry.run(mealId, item.food_item_id, item.quantity_g);
      }
    })();
    res.status(201).json({ id: mealId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/meal-templates/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM meal_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
