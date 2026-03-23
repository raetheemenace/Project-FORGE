// Admin Transaction Oversight Routes
// GET /api/admin/transactions — list all transactions with filters
// PATCH /api/admin/transactions/:id — override transaction status
// Requirements: 15.3, 15.4, 15.9

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Valid statuses for override
const VALID_STATUSES = ['ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'];

// ---------------------------------------------------------------------------
// Helper: log admin action
// ---------------------------------------------------------------------------
async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'TRANSACTION', $3, $4)`,
    [adminId, actionType, targetId, JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/transactions
// Query params: status, department, student (name search), dateFrom, dateTo
// ---------------------------------------------------------------------------
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { status, department, student, dateFrom, dateTo } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push('t.status = $' + idx++);
    params.push(status);
  }
  if (department) {
    conditions.push('t.department = $' + idx++);
    params.push(department);
  }
  if (student) {
    conditions.push('u.full_name ILIKE $' + idx++);
    params.push('%' + student + '%');
  }
  if (dateFrom) {
    conditions.push('t.txn_date >= $' + idx++);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('t.txn_date <= $' + idx++);
    params.push(dateTo);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await db.query(
      `SELECT
         t.txn_id,
         t.department,
         t.course,
         t.time_slot,
         t.txn_date,
         t.lab_room,
         t.adviser,
         t.status,
         t.created_at,
         u.user_id,
         u.full_name,
         u.student_id,
         COALESCE(
           json_agg(
             json_build_object(
               'item_id',      i.item_id,
               'equipment_id', i.equipment_id,
               'condition',    i.condition,
               'name',         e.name
             )
           ) FILTER (WHERE i.item_id IS NOT NULL),
           '[]'
         ) AS items
       FROM forge_transactions t
       JOIN forge_users u ON u.user_id = t.user_id
       LEFT JOIN forge_txn_items i ON i.txn_id = t.txn_id
       LEFT JOIN forge_equipment e ON e.equipment_id = i.equipment_id
       ${where}
       GROUP BY t.txn_id, t.department, t.course, t.time_slot, t.txn_date,
                t.lab_room, t.adviser, t.status, t.created_at,
                u.user_id, u.full_name, u.student_id
       ORDER BY t.txn_date DESC, t.created_at DESC`,
      params
    );

    return res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Admin list transactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/transactions/:id — override transaction status
// Body: { status }
// ---------------------------------------------------------------------------
router.patch('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user.userId;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`,
    });
  }

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT txn_id, status FROM forge_transactions WHERE txn_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const previousStatus = existing.rows[0].status;

    await client.query(
      'UPDATE forge_transactions SET status = $1 WHERE txn_id = $2',
      [status, id]
    );

    await logAdminAction(client, adminId, 'TRANSACTION_OVERRIDDEN', id, {
      txnId: id,
      previousStatus,
      newStatus: status,
    });

    await client.query('COMMIT');

    return res.json({ message: 'Transaction status updated successfully.', txnId: id, status });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    console.error('Admin override transaction error:', err);
    return res.status(500).json({ error: 'Failed to update transaction status.' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
