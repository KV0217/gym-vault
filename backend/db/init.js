import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const dbPath = path.join(__dirname, 'gym.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function addColumnIfNotExists(table, column, definition) {
  try {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = pragma.some(col => col.name === column);
    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (err) {
    // Table might not exist yet
  }
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'athlete',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      user_id INTEGER DEFAULT 1,
      name TEXT DEFAULT 'Athlete',
      weight_kg REAL,
      height_cm REAL,
      age INTEGER,
      gender TEXT DEFAULT 'male',
      goal TEXT DEFAULT 'maintain',
      activity_level TEXT DEFAULT 'moderate',
      tdee INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment TEXT DEFAULT 'bodyweight',
      instructions TEXT,
      is_custom INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      start_time TEXT,
      end_time TEXT,
      duration_min INTEGER,
      notes TEXT,
      template_id INTEGER,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_log_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      weight_kg REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      rpe INTEGER,
      is_warmup INTEGER DEFAULT 0,
      is_pr INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0,
      default_sets INTEGER DEFAULT 3,
      default_reps INTEGER DEFAULT 10,
      FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      weight_kg REAL,
      body_fat_pct REAL,
      chest_cm REAL,
      waist_cm REAL,
      hips_cm REAL,
      biceps_cm REAL,
      thighs_cm REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      calories_per_100g REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      fiber_g REAL,
      serving_size_g REAL DEFAULT 100,
      serving_unit TEXT DEFAULT 'g',
      is_custom INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      meal_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_log_id INTEGER NOT NULL,
      food_item_id INTEGER NOT NULL,
      quantity_g REAL NOT NULL,
      FOREIGN KEY (meal_log_id) REFERENCES meal_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      amount_ml INTEGER NOT NULL DEFAULT 250,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      target_value REAL,
      current_value REAL DEFAULT 0,
      unit TEXT,
      exercise_id INTEGER,
      deadline TEXT,
      completed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      bedtime TEXT,
      wake_time TEXT,
      duration_hours REAL,
      quality INTEGER CHECK(quality BETWEEN 1 AND 5),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS supplement_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      name TEXT NOT NULL,
      dosage TEXT,
      time_taken TEXT DEFAULT 'morning',
      taken INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      action_type TEXT,
      action_data TEXT,
      dismissed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY DEFAULT 1,
      dietary_preference TEXT DEFAULT 'non_veg',
      unit_system TEXT DEFAULT 'metric',
      experience_level TEXT DEFAULT 'intermediate',
      workout_days_per_week INTEGER DEFAULT 5,
      preferred_split TEXT DEFAULT 'ppl',
      rest_timer_default INTEGER DEFAULT 90,
      onboarding_complete INTEGER DEFAULT 0,
      daily_calorie_target INTEGER,
      daily_protein_target REAL,
      daily_carbs_target REAL,
      daily_fat_target REAL,
      water_target_ml INTEGER DEFAULT 3000,
      notifications_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      food_item_id INTEGER NOT NULL,
      quantity_g REAL NOT NULL,
      FOREIGN KEY (template_id) REFERENCES meal_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );
  `);

  db.prepare('INSERT OR IGNORE INTO user_preferences (id) VALUES (1)').run();

  // Seed Exercises
  const exerciseCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get().count;
  if (exerciseCount === 0) {
    const insertExercise = db.prepare(`
      INSERT INTO exercises (name, category, muscle_group, secondary_muscles, equipment, instructions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const exercisesData = [
      ['Barbell Bench Press', 'compound', 'Chest', 'Triceps, Shoulders', 'barbell', 'Lie on bench, press barbell up.'],
      ['Incline Barbell Bench Press', 'compound', 'Chest', 'Triceps, Shoulders', 'barbell', 'Incline bench press.'],
      ['Dumbbell Bench Press', 'compound', 'Chest', 'Triceps, Shoulders', 'dumbbell', 'Flat bench dumbbell press.'],
      ['Incline Dumbbell Press', 'compound', 'Chest', 'Triceps, Shoulders', 'dumbbell', 'Incline bench dumbbell press.'],
      ['Dumbbell Flyes', 'isolation', 'Chest', null, 'dumbbell', 'Flat bench flyes.'],
      ['Cable Crossover', 'isolation', 'Chest', null, 'cable', 'Standing cable crossover.'],
      ['Push-Ups', 'compound', 'Chest', 'Triceps, Core', 'bodyweight', 'Standard push-ups.'],
      ['Decline Bench Press', 'compound', 'Chest', 'Triceps, Shoulders', 'barbell', 'Decline bench press.'],
      ['Chest Dips', 'compound', 'Chest', 'Triceps, Shoulders', 'bodyweight', 'Leaning forward on dip bars.'],
      ['Machine Chest Press', 'compound', 'Chest', 'Triceps, Shoulders', 'machine', 'Seated machine press.'],
      ['Deadlift', 'compound', 'Back', 'Hamstrings, Glutes, Core', 'barbell', 'Standard barbell deadlift.'],
      ['Barbell Row', 'compound', 'Back', 'Biceps, Rear Delts', 'barbell', 'Bent over barbell row.'],
      ['Pull-Ups', 'compound', 'Back', 'Biceps, Core', 'bodyweight', 'Overhand grip pull-ups.'],
      ['Lat Pulldown', 'compound', 'Back', 'Biceps', 'cable', 'Seated lat pulldown.'],
      ['Seated Cable Row', 'compound', 'Back', 'Biceps', 'cable', 'Seated cable row.'],
      ['T-Bar Row', 'compound', 'Back', 'Biceps', 'machine', 'T-bar row machine.'],
      ['Dumbbell Row', 'compound', 'Back', 'Biceps', 'dumbbell', 'One arm dumbbell row.'],
      ['Face Pulls', 'isolation', 'Back', 'Rear Delts', 'cable', 'Cable face pulls.'],
      ['Straight Arm Pulldown', 'isolation', 'Back', null, 'cable', 'Straight arm lat pulldown.'],
      ['Chin-Ups', 'compound', 'Back', 'Biceps, Core', 'bodyweight', 'Underhand grip pull-ups.'],
      ['Barbell Squat', 'compound', 'Legs', 'Glutes, Core', 'barbell', 'High bar back squat.'],
      ['Leg Press', 'compound', 'Legs', 'Glutes, Calves', 'machine', 'Machine leg press.'],
      ['Romanian Deadlift', 'compound', 'Legs', 'Hamstrings, Glutes', 'barbell', 'Stiff leg deadlift.'],
      ['Leg Curl', 'isolation', 'Legs', 'Hamstrings', 'machine', 'Machine leg curl.'],
      ['Leg Extension', 'isolation', 'Legs', 'Quads', 'machine', 'Machine leg extension.'],
      ['Bulgarian Split Squat', 'compound', 'Legs', 'Glutes', 'dumbbell', 'Rear foot elevated split squat.'],
      ['Lunges', 'compound', 'Legs', 'Glutes', 'dumbbell', 'Walking or stationary lunges.'],
      ['Calf Raises', 'isolation', 'Legs', 'Calves', 'machine', 'Standing or seated calf raises.'],
      ['Hack Squat', 'compound', 'Legs', 'Glutes', 'machine', 'Machine hack squat.'],
      ['Hip Thrust', 'compound', 'Legs', 'Glutes', 'barbell', 'Barbell hip thrust.'],
      ['Goblet Squat', 'compound', 'Legs', 'Glutes, Core', 'dumbbell', 'Squat holding dumbbell at chest.'],
      ['Front Squat', 'compound', 'Legs', 'Glutes, Core', 'barbell', 'Barbell resting on front delts.'],
      ['Overhead Press', 'compound', 'Shoulders', 'Triceps, Core', 'barbell', 'Standing barbell press.'],
      ['Dumbbell Lateral Raise', 'isolation', 'Shoulders', null, 'dumbbell', 'Standing lateral raises.'],
      ['Front Raise', 'isolation', 'Shoulders', null, 'dumbbell', 'Dumbbell front raises.'],
      ['Reverse Flyes', 'isolation', 'Shoulders', 'Rear Delts', 'dumbbell', 'Bent over reverse flyes.'],
      ['Arnold Press', 'compound', 'Shoulders', 'Triceps', 'dumbbell', 'Seated Arnold press.'],
      ['Upright Row', 'compound', 'Shoulders', 'Traps', 'barbell', 'Barbell upright row.'],
      ['Face Pulls (shoulders)', 'isolation', 'Shoulders', 'Rear Delts', 'cable', 'Cable face pulls.'],
      ['Military Press', 'compound', 'Shoulders', 'Triceps, Core', 'barbell', 'Strict standing barbell press.'],
      ['Dumbbell Shoulder Press', 'compound', 'Shoulders', 'Triceps', 'dumbbell', 'Seated dumbbell press.'],
      ['Cable Lateral Raise', 'isolation', 'Shoulders', null, 'cable', 'Cable lateral raises.'],
      ['Barbell Curl', 'isolation', 'Arms', 'Biceps', 'barbell', 'Standing barbell curl.'],
      ['Dumbbell Curl', 'isolation', 'Arms', 'Biceps', 'dumbbell', 'Alternating dumbbell curls.'],
      ['Hammer Curl', 'isolation', 'Arms', 'Biceps, Forearms', 'dumbbell', 'Neutral grip curls.'],
      ['Preacher Curl', 'isolation', 'Arms', 'Biceps', 'machine', 'Preacher bench curls.'],
      ['Concentration Curl', 'isolation', 'Arms', 'Biceps', 'dumbbell', 'Seated concentration curls.'],
      ['Cable Curl', 'isolation', 'Arms', 'Biceps', 'cable', 'Standing cable curls.'],
      ['EZ-Bar Curl', 'isolation', 'Arms', 'Biceps', 'barbell', 'EZ-bar curls.'],
      ['Incline Dumbbell Curl', 'isolation', 'Arms', 'Biceps', 'dumbbell', 'Incline bench curls.'],
      ['Tricep Pushdown', 'isolation', 'Arms', 'Triceps', 'cable', 'Cable tricep pushdown.'],
      ['Skull Crushers', 'isolation', 'Arms', 'Triceps', 'barbell', 'Lying tricep extensions.'],
      ['Overhead Tricep Extension', 'isolation', 'Arms', 'Triceps', 'dumbbell', 'Overhead dumbbell extension.'],
      ['Close-Grip Bench Press', 'compound', 'Arms', 'Triceps, Chest', 'barbell', 'Close grip flat bench.'],
      ['Tricep Dips', 'compound', 'Arms', 'Triceps, Chest', 'bodyweight', 'Upright dips.'],
      ['Diamond Push-Ups', 'compound', 'Arms', 'Triceps, Chest', 'bodyweight', 'Hands forming diamond shape.'],
      ['Cable Overhead Extension', 'isolation', 'Arms', 'Triceps', 'cable', 'Cable overhead extension.'],
      ['Kickbacks', 'isolation', 'Arms', 'Triceps', 'dumbbell', 'Dumbbell tricep kickbacks.'],
      ['Plank', 'isolation', 'Core', null, 'bodyweight', 'Forearm plank hold.'],
      ['Crunches', 'isolation', 'Core', null, 'bodyweight', 'Standard crunches.'],
      ['Hanging Leg Raise', 'isolation', 'Core', null, 'bodyweight', 'Hanging from bar, raise legs.'],
      ['Russian Twist', 'isolation', 'Core', 'Obliques', 'bodyweight', 'Seated twists.'],
      ['Ab Wheel Rollout', 'isolation', 'Core', null, 'bodyweight', 'Rollouts using ab wheel.'],
      ['Cable Woodchop', 'isolation', 'Core', 'Obliques', 'cable', 'Cable torso twists.'],
      ['Mountain Climbers', 'compound', 'Core', 'Cardio', 'bodyweight', 'Alternating knee to chest.'],
      ['Dead Bug', 'isolation', 'Core', null, 'bodyweight', 'Lying on back, alternating arm/leg extension.'],
      ['Bicycle Crunches', 'isolation', 'Core', 'Obliques', 'bodyweight', 'Elbow to opposite knee crunches.'],
      ['Dragon Flag', 'isolation', 'Core', null, 'bodyweight', 'Advanced core lift from bench.'],
      ['Running', 'cardio', 'Cardio', 'Legs', 'cardio_machine', 'Treadmill or outdoor.'],
      ['Cycling', 'cardio', 'Cardio', 'Legs', 'cardio_machine', 'Stationary bike or outdoor.'],
      ['Jump Rope', 'cardio', 'Cardio', 'Calves', 'bodyweight', 'Skipping rope.'],
      ['Rowing Machine', 'cardio', 'Cardio', 'Back, Legs', 'cardio_machine', 'Ergometer.'],
      ['Stair Climber', 'cardio', 'Cardio', 'Legs', 'cardio_machine', 'Stair machine.'],
      ['Battle Ropes', 'cardio', 'Cardio', 'Arms, Shoulders', 'equipment', 'Alternating wave slams.'],
      ['Swimming', 'cardio', 'Cardio', 'Full Body', 'bodyweight', 'Pool swimming.'],
      ['Elliptical', 'cardio', 'Cardio', 'Legs, Arms', 'cardio_machine', 'Elliptical machine.']
    ];

    db.transaction(() => {
      for (const ex of exercisesData) {
        insertExercise.run(...ex);
      }
    })();
  }

  // Seed Templates
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM workout_templates').get().count;
  if (templateCount === 0) {
    const insertTemplate = db.prepare('INSERT INTO workout_templates (name, description, category) VALUES (?, ?, ?)');
    const insertTemplateExercise = db.prepare('INSERT INTO template_exercises (template_id, exercise_id, order_index, default_sets, default_reps) VALUES (?, ?, ?, ?, ?)');
    
    db.transaction(() => {
      // 1. Push Day
      const pushRes = insertTemplate.run('Push Day', 'Chest, Shoulders, and Triceps focus', 'Hypertrophy');
      const pushId = pushRes.lastInsertRowid;
      
      const pushExercises = [
        ['Barbell Bench Press', 4, 8],
        ['Overhead Press', 3, 10],
        ['Incline Dumbbell Press', 3, 12],
        ['Cable Crossover', 3, 15],
        ['Dumbbell Lateral Raise', 3, 15],
        ['Tricep Pushdown', 3, 12],
        ['Overhead Tricep Extension', 3, 12]
      ];
      
      pushExercises.forEach((item, index) => {
        const ex = db.prepare('SELECT id FROM exercises WHERE name = ?').get(item[0]);
        if(ex) insertTemplateExercise.run(pushId, ex.id, index, item[1], item[2]);
      });

      // 2. Pull Day
      const pullRes = insertTemplate.run('Pull Day', 'Back and Biceps focus', 'Hypertrophy');
      const pullId = pullRes.lastInsertRowid;
      
      const pullExercises = [
        ['Deadlift', 3, 5],
        ['Barbell Row', 4, 8],
        ['Pull-Ups', 3, 10],
        ['Seated Cable Row', 3, 12],
        ['Face Pulls', 3, 15],
        ['Barbell Curl', 3, 12],
        ['Hammer Curl', 3, 12]
      ];
      
      pullExercises.forEach((item, index) => {
        const ex = db.prepare('SELECT id FROM exercises WHERE name = ?').get(item[0]);
        if(ex) insertTemplateExercise.run(pullId, ex.id, index, item[1], item[2]);
      });

      // 3. Leg Day
      const legRes = insertTemplate.run('Leg Day', 'Lower body focus', 'Hypertrophy');
      const legId = legRes.lastInsertRowid;
      
      const legExercises = [
        ['Barbell Squat', 4, 8],
        ['Romanian Deadlift', 3, 10],
        ['Leg Press', 3, 12],
        ['Leg Curl', 3, 12],
        ['Leg Extension', 3, 15],
        ['Calf Raises', 4, 15],
        ['Hip Thrust', 3, 12]
      ];
      
      legExercises.forEach((item, index) => {
        const ex = db.prepare('SELECT id FROM exercises WHERE name = ?').get(item[0]);
        if(ex) insertTemplateExercise.run(legId, ex.id, index, item[1], item[2]);
      });
    })();
  }

  // Seed Food Items
  const foodCount = db.prepare('SELECT COUNT(*) as count FROM food_items').get().count;
  if (foodCount === 0) {
    const insertFood = db.prepare(`
      INSERT INTO food_items (name, category, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, serving_size_g, serving_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const foods = [
      ['Chicken Breast', 'Meat', 165, 31, 0, 3.6, 0, 100, 'g'],
      ['Eggs whole', 'Dairy', 155, 13, 1.1, 11, 0, 100, 'g'],
      ['Rice (white, cooked)', 'Grains', 130, 2.7, 28, 0.3, 0.4, 100, 'g'],
      ['Oats', 'Grains', 389, 16.9, 66.3, 6.9, 10.6, 100, 'g'],
      ['Banana', 'Fruit', 89, 1.1, 22.8, 0.3, 2.6, 100, 'g'],
      ['Paneer', 'Dairy', 265, 18.3, 1.2, 20.8, 0, 100, 'g'],
      ['Dal (Toor cooked)', 'Legumes', 116, 7.5, 20, 0.4, 5, 100, 'g'],
      ['Whole Wheat Roti', 'Grains', 297, 9.8, 61.5, 1.5, 9.7, 40, 'roti'],
      ['Milk (whole)', 'Dairy', 61, 3.2, 4.8, 3.3, 0, 100, 'ml'],
      ['Whey Protein', 'Supplement', 400, 80, 10, 5, 0, 30, 'scoop'], // Adjusted to per 100g based on 120cal/30g
      ['Peanut Butter', 'Fats', 588, 25, 20, 50, 6, 100, 'g'],
      ['Sweet Potato', 'Vegetable', 86, 1.6, 20, 0.1, 3, 100, 'g'],
      ['Greek Yogurt', 'Dairy', 59, 10, 3.6, 0.4, 0, 100, 'g'],
      ['Almonds', 'Nuts', 579, 21, 22, 49, 12.5, 100, 'g'],
      ['Brown Rice (cooked)', 'Grains', 111, 2.6, 23, 0.9, 1.8, 100, 'g'],
      ['Salmon', 'Seafood', 208, 20, 0, 13, 0, 100, 'g'],
      ['Tuna (canned)', 'Seafood', 116, 25.5, 0, 0.8, 0, 100, 'g'],
      ['Broccoli', 'Vegetable', 34, 2.8, 7, 0.4, 2.6, 100, 'g'],
      ['Avocado', 'Fruit', 160, 2, 8.5, 14.7, 6.7, 100, 'g'],
      ['Cottage Cheese', 'Dairy', 98, 11, 3.4, 4.3, 0, 100, 'g']
    ];

    db.transaction(() => {
      for (const food of foods) {
        insertFood.run(...food);
      }
    })();
  }

  // Schema migrations: ensure user_id exists on user-scoped tables
  addColumnIfNotExists('workout_sessions', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('body_metrics', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('meal_logs', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('water_logs', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('goals', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('sleep_logs', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('supplement_logs', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('ai_insights', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('meal_templates', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('workout_templates', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('user_profile', 'user_id', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('user_preferences', 'user_id', 'INTEGER DEFAULT 1');

  // Seed default demo user in users table
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (1, 'athlete@gym.app', ?, 'Athlete', 'athlete')
    `).run(hash);
  }

  // Seed default user profile
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM user_profile').get().count;
  if (profileCount === 0) {
    db.prepare(`
      INSERT INTO user_profile (id, user_id, name, weight_kg, height_cm, age, gender, goal, activity_level, tdee)
      VALUES (1, 1, 'Athlete', 75, 175, 25, 'male', 'maintain', 'moderate', 2500)
    `).run();
  }
}

initDb();

export default db;

