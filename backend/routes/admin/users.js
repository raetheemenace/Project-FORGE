const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// GET /api/admin/users
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT USER_ID, STUDENT_ID, USERNAME, FULL_NAME, PROGRAM, ROLE, CREATED_AT
       FROM FORGE_USERS
       ORDER BY CREATED_AT DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// PATCH /api/admin/users/:id — disable or enable account (toggle role to DISABLED)
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { action } = req.body; // 'disable' | 'enable'
  if (!action || !['disable', 'enable'].includes(action)) {
    return res.status(400).json({ error: "action must be 'disable' or 'enable'" });
  }

  // Prevent admin from disabling themselves
  if (Number(req.params.id) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot modify your own account' });
  }

  let conn;
  try {
    conn = await getConnection();

    const check = await conn.execute(
      `SELECT USER_ID, ROLE FROM FORGE_USERS WHERE USER_ID = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const newRole = action === 'disable' ? 'DISABLED' : 'STUDENT';
    await conn.execute(
      `UPDATE FORGE_USERS SET ROLE = :role WHERE USER_ID = :id`,
      { role: newRole, id: req.params.id }
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, :actionType, 'USER', :targetId, :details)`,
      {
        adminId:    req.user.userId,
        actionType: action === 'disable' ? 'USER_DISABLED' : 'USER_ENABLED',
        targetId:   String(req.params.id),
        details:    `Account ${action}d by admin`,
      }
    );
    await conn.commit();
    res.json({ message: `User account ${action}d` });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
