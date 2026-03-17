const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validate all fields present
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Check if username is already taken
    const existingUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Check if email is already taken
    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, password_hash]
    );
    const user = result.rows[0];

    // Check if this is the first user — if so, make them admin
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE id != $1',
      [user.id]
    );
    const otherUsersCount = parseInt(countResult.rows[0].count, 10);
    if (otherUsersCount === 0) {
      await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.id]);
    }

    // Query is_admin from DB
    const adminResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
    const is_admin = adminResult.rows[0].is_admin;

    // Generate JWT including is_admin
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, is_admin },
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find user by email including is_admin
    const result = await pool.query(
      'SELECT id, username, email, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT including is_admin
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin },
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

// GET /api/auth/me — protected
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
