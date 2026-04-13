// Admin Transaction Oversight Routes
const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const VALID_STATUSES = ['ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'];

const STATUS_MESSAGES = {
  ACTIVE:         (id) => `Your transaction ${id} is now ACTIVE. Equipment is ready for pickup.`,
  PENDING_RETURN: (id) => `Your transaction ${id} is pending return. Please return the equipment.`,
  CLAIM_ID:       (id) => `A Claim ID has been issued for transaction ${id}. Present it at the lab counter.`,
  RETURNED:       (id) => `Your transaction ${id} has been marked as RETURNED. Thank you!`,
};

async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'TRANSACTION', $3, $4)`,
    [adminId, actionType, targetId, JSON.stringify(details)]
  );
}

// GET /api/admin/transactions
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { status, department, student, dateFrom, dateTo } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (status)     { conditions.push(`t.status = $${idx++}`);        params.push(status); }
  if (department) { conditions.push(`t.department = $${idx++}`);    params.push(department); }
  if (student)    { conditions.push(`u.full_name ILIKE $${idx++}`); params.push('%' + student + '%'); }
  if (dateFrom)   { conditions.push(`t.txn_date >= $${idx++}`);     params.push(dateFrom); }
  if (dateTo)     { conditions.push(`t.txn_date <= $${idx++}`);     params.push(dateTo); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await db.query(
      `SELECT
         t.txn_id, t.department, t.course, t.time_slot, t.txn_date,
         t.lab_room, t.adviser, t.status, t.created_at,
         u.user_id, u.full_name, u.student_id,
         COALESCE(
           json_agg(
             json_build_object(
               'item_id', i.item_id, 'equipment_id', i.equipment_id,
               'condition', i.condition, 'name', e.name
             )
           ) FILTER (WHERE i.item_id IS NOT NULL), '[]'
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

// PATCH /api/admin/transactions/:id
router.patch('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user.userId;

  console.log(`[PATCH /admin/transactions] id=${id} status=${status} adminId=${adminId}`);

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT txn_id, status, user_id FROM forge_transactions WHERE txn_id = $1', [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const previousStatus = existing.rows[0].status;
    const txnUserId = existing.rows[0].user_id;
    console.log(`[PATCH] txnUserId=${txnUserId} previousStatus=${previousStatus} -> ${status}`);

    await client.query(
      'UPDATE forge_transactions SET status = $1 WHERE txn_id = $2',
      [status, id]
    );

    if (status === 'RETURNED') {
      await client.query(
        `UPDATE forge_equipment SET status = 'AVAILABLE'
         WHERE equipment_id IN (
           SELECT equipment_id FROM forge_txn_items
           WHERE txn_id = $1 AND equipment_id IS NOT NULL
         )`,
        [id]
      );
    }

    // Insert notification using the user_id we already have
    const message = STATUS_MESSAGES[status]
      ? STATUS_MESSAGES[status](id)
      : `Your transaction ${id} status was updated to ${status}.`;

    console.log(`[PATCH] Inserting notification for user ${txnUserId}: ${message}`);

    await client.query(
      `INSERT INTO forge_notifications (user_id, type, message) VALUES ($1, 'STATUS_UPDATE', $2)`,
      [txnUserId, message]
    );

    console.log(`[PATCH] Notification inserted successfully`);

    await logAdminAction(client, adminId, 'TRANSACTION_OVERRIDDEN', id, {
      txnId: id, previousStatus, newStatus: status,
    });

    await client.query('COMMIT');
    console.log(`[PATCH] COMMIT done`);

    return res.json({ message: 'Transaction status updated successfully.', txnId: id, status });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('[PATCH] Error:', err.message);
    console.error(err.stack);
    return res.status(500).json({ error: 'Failed to update transaction status.', detail: err.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
