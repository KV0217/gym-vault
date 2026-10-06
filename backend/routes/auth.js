import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/init.js';
import { JWT_SECRET, authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'athlete')
    `).run(trimmedEmail, password_hash, name.trim());

    const userId = result.lastInsertRowid;

    // Initialize user profile for new user
    db.prepare(`
      INSERT INTO user_profile (user_id, name, weight_kg, height_cm, age, gender, goal, activity_level, tdee)
      VALUES (?, ?, 75, 175, 25, 'male', 'maintain', 'moderate', 2500)
    `).run(userId, name.trim());

    // Initialize user preferences for new user
    db.prepare(`
      INSERT INTO user_preferences (user_id, dietary_preference, unit_system, experience_level, workout_days_per_week, preferred_split, onboarding_complete)
      VALUES (?, 'non_veg', 'metric', 'intermediate', 5, 'ppl', 0)
    `).run(userId);

    const token = jwt.sign(
      { id: userId, email: trimmedEmail, name: name.trim(), role: 'athlete' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: trimmedEmail,
        name: name.trim(),
        role: 'athlete'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// POST /api/auth/apple
router.post('/apple', (req, res) => {
  try {
    const { email, name, appleId } = req.body;
    const userEmail = email ? email.trim().toLowerCase() : `apple_${appleId || Date.now()}@privaterelay.appleid.com`;
    const userName = name || 'Apple Athlete';

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);

    if (!user) {
      const dummyHash = bcrypt.hashSync(Math.random().toString(36), 10);
      const result = db.prepare(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (?, ?, ?, 'athlete')
      `).run(userEmail, dummyHash, userName);

      const userId = result.lastInsertRowid;
      db.prepare(`
        INSERT INTO user_profile (user_id, name, weight_kg, height_cm, age, gender, goal, activity_level, tdee)
        VALUES (?, ?, 75, 175, 25, 'male', 'maintain', 'moderate', 2500)
      `).run(userId, userName);

      db.prepare(`
        INSERT INTO user_preferences (user_id, dietary_preference, unit_system, experience_level, workout_days_per_week, preferred_split, onboarding_complete)
        VALUES (?, 'non_veg', 'metric', 'intermediate', 5, 'ppl', 0)
      `).run(userId);

      user = { id: userId, email: userEmail, name: userName, role: 'athlete' };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Apple auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Apple' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ? OR id = ? LIMIT 1').get(req.user.id, req.user.id) || {};
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? OR id = ? LIMIT 1').get(req.user.id, req.user.id) || {};

    res.json({
      user,
      profile: {
        ...profile,
        ...preferences
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

export default router;
