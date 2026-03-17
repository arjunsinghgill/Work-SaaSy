const { pool } = require('../db');

async function canReadTask(taskId, userId, isAdmin) {
  if (isAdmin) return true;
  const result = await pool.query(`
    SELECT 1 FROM tasks t
    LEFT JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = $2
    WHERE t.id = $1
      AND (t.user_id = $2 OR t.assigned_to_id = $2 OR tm.user_id IS NOT NULL)
    LIMIT 1
  `, [taskId, userId]);
  return result.rows.length > 0;
}

async function canWriteTask(taskId, userId, isAdmin) {
  if (isAdmin) return true;
  const result = await pool.query(`
    SELECT 1 FROM tasks t
    LEFT JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = $2
    WHERE t.id = $1
      AND (t.user_id = $2 OR tm.user_id IS NOT NULL)
    LIMIT 1
  `, [taskId, userId]);
  return result.rows.length > 0;
}

module.exports = { canReadTask, canWriteTask };
