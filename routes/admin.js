const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

router.use(authenticateToken, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.is_admin, u.created_at,
             COUNT(t.id)::int AS task_count
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/tasks
router.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.username AS creator_username, a.username AS assignee_username
      FROM tasks t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN users a ON a.id = t.assigned_to_id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// DELETE /api/admin/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// GET /api/admin/teams
router.get('/teams', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.username AS owner_username, COUNT(tm.user_id)::int AS member_count
      FROM teams t
      JOIN users u ON u.id = t.owner_id
      LEFT JOIN team_members tm ON tm.team_id = t.id
      GROUP BY t.id, u.username
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// DELETE /api/admin/teams/:id
router.delete('/teams/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ message: 'Team deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team.' });
  }
});

module.exports = router;
