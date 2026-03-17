const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { canReadTask, canWriteTask } = require('../lib/taskAccess');

router.use(authenticateToken);

// GET /api/tasks
// ?view=inbox  → tasks assigned to me by others
// ?view=mine   → tasks I created (default)
// ?team_id=X   → all tasks in a team (must be a member)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;
    const { view, team_id } = req.query;

    let query, params;

    if (team_id) {
      // Team board — verify membership first
      const memberCheck = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [team_id, userId]
      );
      if (!memberCheck.rows.length && !isAdmin) {
        return res.status(403).json({ error: 'Not a member of this team.' });
      }
      query = `
        SELECT t.*,
               u.username AS creator_username,
               a.username AS assignee_username
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_to_id
        WHERE t.team_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [team_id];
    } else if (view === 'inbox') {
      // Tasks assigned to me by others
      query = `
        SELECT t.*,
               u.username AS creator_username,
               a.username AS assignee_username
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_to_id
        WHERE t.assigned_to_id = $1 AND t.user_id != $1
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    } else if (isAdmin && view === 'all') {
      query = `
        SELECT t.*,
               u.username AS creator_username,
               a.username AS assignee_username
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_to_id
        ORDER BY t.created_at DESC
      `;
      params = [];
    } else {
      // Default: tasks I created with no team
      query = `
        SELECT t.*,
               u.username AS creator_username,
               a.username AS assignee_username
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_to_id
        WHERE t.user_id = $1 AND t.team_id IS NULL
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description, team_id, assigned_to_id } = req.body;
    const userId = req.user.id;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    // Validate team membership if team_id provided
    if (team_id) {
      const memberCheck = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [team_id, userId]
      );
      if (!memberCheck.rows.length) {
        return res.status(403).json({ error: 'Not a member of this team.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, team_id, assigned_to_id, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, team_id || null, assigned_to_id || null, title.trim(), description?.trim() || null]
    );

    const task = result.rows[0];

    // Create notification if assigned to someone else
    if (assigned_to_id && assigned_to_id !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, entity_type, entity_id)
         VALUES ($1, 'assignment', $2, 'task', $3)`,
        [assigned_to_id, `@${req.user.username} assigned you a task: "${title.trim()}"`, task.id]
      );
    }

    // Fetch with usernames
    const enriched = await pool.query(`
      SELECT t.*, u.username AS creator_username, a.username AS assignee_username
      FROM tasks t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN users a ON a.id = t.assigned_to_id
      WHERE t.id = $1
    `, [task.id]);

    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;

    const hasWrite = await canWriteTask(id, userId, isAdmin);
    if (!hasWrite) return res.status(403).json({ error: 'Access denied.' });

    const { title, description, completed, assigned_to_id } = req.body;

    // Only the task creator or admin can reassign
    if (assigned_to_id !== undefined) {
      const taskRow = await pool.query('SELECT user_id FROM tasks WHERE id = $1', [id]);
      if (taskRow.rows[0]?.user_id !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Only the task creator can reassign.' });
      }
    }

    const fields = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { fields.push(`title = $${i++}`); values.push(title.trim()); }
    if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description.trim() || null); }
    if (completed !== undefined) { fields.push(`completed = $${i++}`); values.push(completed); }
    if (assigned_to_id !== undefined) { fields.push(`assigned_to_id = $${i++}`); values.push(assigned_to_id || null); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Task not found.' });

    // Notify new assignee
    if (assigned_to_id && assigned_to_id !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, entity_type, entity_id)
         VALUES ($1, 'assignment', $2, 'task', $3)`,
        [assigned_to_id, `@${req.user.username} assigned you a task`, id]
      );
    }

    const enriched = await pool.query(`
      SELECT t.*, u.username AS creator_username, a.username AS assignee_username
      FROM tasks t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN users a ON a.id = t.assigned_to_id
      WHERE t.id = $1
    `, [id]);

    res.json(enriched.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;

    // Only creator or admin can delete
    const taskRow = await pool.query('SELECT user_id FROM tasks WHERE id = $1', [id]);
    if (!taskRow.rows.length) return res.status(404).json({ error: 'Task not found.' });
    if (taskRow.rows[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Only the task creator can delete this task.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
