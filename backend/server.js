import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db/init.js';

import exercisesRouter from './routes/exercises.js';
import workoutsRouter from './routes/workouts.js';
import templatesRouter from './routes/templates.js';
import bodyMetricsRouter from './routes/bodyMetrics.js';
import nutritionRouter from './routes/nutrition.js';
import dashboardRouter from './routes/dashboard.js';
import profileRouter from './routes/profile.js';
import progressRouter from './routes/progress.js';
import aiRouter from './routes/ai.js';
import goalsRouter from './routes/goals.js';
import sleepRouter from './routes/sleep.js';
import supplementsRouter from './routes/supplements.js';
import authRouter from './routes/auth.js';
import { optionalAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../frontend/dist');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRouter);

// Attach optionalAuth to all /api routes so req.user is set
app.use('/api', optionalAuth);

// API routes
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/body-metrics', bodyMetricsRouter);
app.use('/api/nutrition', nutritionRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/progress', progressRouter);
app.use('/api/ai', aiRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/sleep', sleepRouter);
app.use('/api/supplements', supplementsRouter);

// Serve compiled React frontend if present
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, HOST, () => {
  console.log(`GYM Tracker App running at:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
});

