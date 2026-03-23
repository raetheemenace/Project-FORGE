// Admin User Management Routes
// GET  /api/admin/users       — list all users
// PATCH /api/admin/users/:id  — disable/enable account
// Requirements: 15.6, 15.9

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: log admin action
// ---------------------------------------------------------------------------
async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'USER', $3, $4)`,
    [adminId, actionType, String(targetId), JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users
// ---------------------------------------------------------------------------
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         user_id,
         student_id,
         full_name,
         program,
         role,
         created_at
       FROM forge_users
       ORDER BY created_at DESC`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin list users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id — disable or enable a user account
// Body: { disabled: true | false }
// ---------------------------------------------------------------------------
router.patch('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { disabled } = req.body;
  const adminId = req.user.userId;

  if (typeof disabled !== 'boolean') {
    return res.status(400).json({ error: 'disabled field must be a boolean.' });
  }

  // Prevent admin from disabling their own account
  if (Number(id) === Number(adminId)) {
    return res.status(400).json({ error: 'You cannot disable your own account.' });
  }

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT user_id, full_name FROM forge_users WHERE user_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = existing.rows[0];

    // forge_users has no is_disabled column — track disable state via role demotion
    // Disabled users get role set to 'DISABLED', enabled users revert to 'STUDENT'
    const newRole = disabled ? 'DISABLED' : 'STUDENT';
    await client.query(
      'UPDATE forge_users SET role = $1 WHERE user_id = $2',
      [newRole, id]
    );

    const actionType = disabled ? 'USER_DISABLED' : 'USER_ENABLED';
    await logAdminAction(client, adminId, actionType, id, {
      userId: id,
      fullName: user.full_name,
      newState: disabled ? 'disabled' : 'enabled',
    });

    await client.query('COMMIT');

    return res.json({
      message: `User account ${disabled ? 'disabled' : 'enabled'} successfully.`,
      userId: id,
      disabled,
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    console.error('Admin update user error:', err);
    return res.status(500).json({ error: 'Failed to update user account.' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
