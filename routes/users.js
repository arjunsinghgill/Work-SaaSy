const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/users/search?q=  — search users by username prefix
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const result = await pool.query(
      'SELECT id, username FROM users WHERE username ILIKE $1 ORDER BY username LIMIT 10',
      [`${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;
