const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/teams — teams current user belongs to
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.username AS owner_username,
             COUNT(tm2.user_id)::int AS member_count
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
      JOIN users u ON u.id = t.owner_id
      LEFT JOIN team_members tm2 ON tm2.team_id = t.id
      GROUP BY t.id, u.username
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// POST /api/teams — create a team
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Team name is required.' });

    const teamResult = await pool.query(
      'INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.user.id]
    );
    const team = teamResult.rows[0];

    // Add creator as owner member
    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.id, req.user.id, 'owner']
    );

    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create team.' });
  }
});

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  try {
    const memberCheck = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!memberCheck.rows.length && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not a team member.' });
    }
    const result = await pool.query(
      'SELECT t.*, u.username AS owner_username FROM teams t JOIN users u ON u.id = t.owner_id WHERE t.id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Team not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team.' });
  }
});

// PUT /api/teams/:id — rename
router.put('/:id', async (req, res) => {
  try {
    const ownerCheck = await pool.query(
      "SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner'",
      [req.params.id, req.user.id]
    );
    if (!ownerCheck.rows.length && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only team owner can rename.' });
    }
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
    const result = await pool.query(
      'UPDATE teams SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team.' });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
  try {
    const ownerCheck = await pool.query(
      "SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner'",
      [req.params.id, req.user.id]
    );
    if (!ownerCheck.rows.length && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only owner or admin can delete.' });
    }
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ message: 'Team deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team.' });
  }
});

// GET /api/teams/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const memberCheck = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!memberCheck.rows.length && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not a team member.' });
    }
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members.' });
  }
});

// POST /api/teams/:id/members — add member by username
router.post('/:id/members', async (req, res) => {
  try {
    const ownerCheck = await pool.query(
      "SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner'",
      [req.params.id, req.user.id]
    );
    if (!ownerCheck.rows.length && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only owner can add members.' });
    }
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found.' });

    const newUserId = userResult.rows[0].id;
    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, newUserId, 'member']
    );
    res.status(201).json({ message: 'Member added.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// DELETE /api/teams/:id/members/:userId — remove or leave
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const isSelf = req.user.id === parseInt(req.params.userId);
    const ownerCheck = await pool.query(
      "SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner'",
      [req.params.id, req.user.id]
    );
    const isOwner = ownerCheck.rows.length > 0;

    if (!isSelf && !isOwner && !req.user.is_admin) {
      return res.status(403).json({ error: 'Cannot remove this member.' });
    }
    await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

module.exports = router;
