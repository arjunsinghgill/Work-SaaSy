const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  // users (existing + new is_admin column)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_admin      BOOLEAN DEFAULT false,
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add is_admin column if users table already existed without it
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
  `);

  // teams (new)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // team_members (new)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role      VARCHAR(20) NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (team_id, user_id)
    );
  `);

  // tasks (existing + new columns)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      team_id        INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title          VARCHAR(255) NOT NULL,
      description    TEXT,
      completed      BOOLEAN DEFAULT false,
      created_at     TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add new columns if tasks table already existed without them
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
  `);
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);

  // comments (new)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id         SERIAL PRIMARY KEY,
      task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // notifications (new)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        VARCHAR(50) NOT NULL,
      message     TEXT NOT NULL,
      entity_type VARCHAR(50),
      entity_id   INTEGER,
      is_read     BOOLEAN DEFAULT false,
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Database initialized');
};

module.exports = { pool, initDB };
