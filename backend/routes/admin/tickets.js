const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// Valid ticket status transitions: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
const TRANSITIONS = {
  OPEN:        ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

// GET /api/admin/tickets
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { status, priority } = req.query;
  let conn;
  try {
    conn = await getConnection();
    const params = {};
    let sql = `
      SELECT tk.TICKET_ID, tk.REPORT_ID, tk.STATUS, tk.PRIORITY,
             tk.RESOLUTION, tk.RESOLVED_AT, tk.CREATED_AT,
             m.EQUIPMENT_ID, m.SEVERITY, m.DESCRIPTION,
             e.NAME AS EQUIPMENT_NAME,
             u.FULL_NAME AS REPORTER_NAME,
             a.FULL_NAME AS ASSIGNED_NAME
      FROM FORGE_MAINTENANCE_TICKETS tk
      JOIN FORGE_MAINTENANCE m ON tk.REPORT_ID = m.REPORT_ID
      JOIN FORGE_EQUIPMENT e   ON m.EQUIPMENT_ID = e.EQUIPMENT_ID
      JOIN FORGE_USERS u       ON m.USER_ID = u.USER_ID
      LEFT JOIN FORGE_USERS a  ON tk.ASSIGNED_TO = a.USER_ID
      WHERE 1=1`;

    if (status)   { sql += ` AND tk.STATUS = :status`;     params.status = status; }
    if (priority) { sql += ` AND tk.PRIORITY = :priority`; params.priority = priority; }
    sql += ` ORDER BY tk.CREATED_AT DESC`;

    const result = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('List tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// PATCH /api/admin/tickets/:id — update status, assignment, resolution
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { status, assignedTo, resolution } = req.body;
  let conn;
  try {
    conn = await getConnection();

    const current = await conn.execute(
      `SELECT STATUS FROM FORGE_MAINTENANCE_TICKETS WHERE TICKET_ID = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const currentStatus = current.rows[0].STATUS;

    // Enforce forward-only status transitions
    if (status && status !== currentStatus) {
      const allowed = TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Invalid transition: ${currentStatus} -> ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
        });
      }
    }

    const updates = [];
    const params  = { id: req.params.id };
    if (status)     { updates.push('STATUS = :status');           params.status = status; }
    if (assignedTo) { updates.push('ASSIGNED_TO = :assignedTo');  params.assignedTo = assignedTo; }
    if (resolution) { updates.push('RESOLUTION = :resolution');   params.resolution = resolution; }
    if (status === 'RESOLVED') {
      updates.push('RESOLVED_AT = SYSTIMESTAMP');
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    await conn.execute(
      `UPDATE FORGE_MAINTENANCE_TICKETS SET ${updates.join(', ')} WHERE TICKET_ID = :id`,
      params
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'TICKET_UPDATED', 'TICKET', :targetId, :details)`,
      { adminId: req.user.userId, targetId: String(req.params.id), details: JSON.stringify(req.body) }
    );
    await conn.commit();
    res.json({ message: 'Ticket updated' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
