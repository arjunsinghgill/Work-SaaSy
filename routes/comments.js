const express = require('express');
const router = express.Router({ mergeParams: true });
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { canReadTask } = require('../lib/taskAccess');

router.use(authenticateToken);

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const canRead = await canReadTask(taskId, req.user.id, req.user.is_admin);
    if (!canRead) return res.status(403).json({ error: 'Access denied.' });

    const result = await pool.query(`
      SELECT c.*, u.username AS author_username
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [taskId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { body } = req.body;

    if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required.' });

    const canRead = await canReadTask(taskId, req.user.id, req.user.is_admin);
    if (!canRead) return res.status(403).json({ error: 'Access denied.' });

    const result = await pool.query(
      'INSERT INTO comments (task_id, author_id, body) VALUES ($1, $2, $3) RETURNING *',
      [taskId, req.user.id, body.trim()]
    );
    const comment = result.rows[0];

    // Parse @mentions
    const mentions = [...body.matchAll(/\B@([a-zA-Z0-9_]+)/g)].map(m => m[1]);
    for (const username of mentions) {
      const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (userResult.rows.length && userResult.rows[0].id !== req.user.id) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, entity_type, entity_id)
           VALUES ($1, 'mention', $2, 'task', $3)`,
          [userResult.rows[0].id, `@${req.user.username} mentioned you in a comment`, taskId]
        );
      }
    }

    const enriched = await pool.query(`
      SELECT c.*, u.username AS author_username
      FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.id = $1
    `, [comment.id]);

    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment.' });
  }
});

// DELETE /api/tasks/:taskId/comments/:id
router.delete('/:taskId/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const commentRow = await pool.query('SELECT author_id FROM comments WHERE id = $1', [id]);
    if (!commentRow.rows.length) return res.status(404).json({ error: 'Comment not found.' });
    if (commentRow.rows[0].author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the author can delete this comment.' });
    }
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
