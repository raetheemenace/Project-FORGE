const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { getNextTxnId } = require('../utils/txnId');

/**
 * POST /api/transactions
 * Create a new borrowing transaction atomically (ACID).
 * Body: { department, course, timeSlot, date, labRoom, adviser, items: [{equipmentId, name, condition}] }
 * Response: { txnId, message }
 */
router.post('/', authenticateToken, async (req, res) => {
  const { department, course, timeSlot, date, labRoom, adviser, items } = req.body;

  // Basic validation
  if (!department || !course || !timeSlot || !date || !labRoom || !adviser) {
    return res.status(400).json({ error: 'All session fields are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one equipment item is required.' });
  }

  const userId = req.user.userId;
  const txnDate = new Date(date);

  let client;
  try {
    client = await db.getConnection();

    // BEGIN transaction
    await client.query('BEGIN');

    // Generate unique Transaction ID (uses COUNT within the same transaction for ACID)
    const txnId = await getNextTxnId(client, txnDate);

    // Insert transaction header
    await client.query(
      `INSERT INTO forge_transactions
         (txn_id, user_id, department, course, time_slot, txn_date, lab_room, adviser, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')`,
      [txnId, userId, department, course, timeSlot, date, labRoom, adviser]
    );

    // Insert each item and mark equipment as BORROWED
    for (const item of items) {
      await client.query(
        `INSERT INTO forge_txn_items (txn_id, equipment_id, condition)
         VALUES ($1, $2, $3)`,
        [txnId, item.equipmentId || null, item.condition || null]
      );
      if (item.equipmentId) {
        await client.query(
          `UPDATE forge_equipment SET status = 'BORROWED' WHERE equipment_id = $1`,
          [item.equipmentId]
        );
      }
    }

    // Notify the student
    await client.query(
      `INSERT INTO forge_notifications (user_id, type, message) VALUES ($1, 'BORROW', $2)`,
      [userId, `Your borrowing transaction ${txnId} was successfully submitted. Present your Claim ID at the lab counter.`]
    );

    // COMMIT
    await client.query('COMMIT');

    return res.status(201).json({ txnId, message: 'Transaction created successfully.' });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore rollback error */ }
    }

    // Unique constraint violation → concurrency conflict
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Transaction ID conflict. Please retry.' });
    }

    console.error('Transaction creation error:', err);
    return res.status(500).json({ error: 'Failed to create transaction. Please retry.' });
  } finally {
    if (client) client.release();
  }
});

/**
 * GET /api/transactions
 * Fetch all transactions for the authenticated student, ordered by date descending.
 * Joins forge_txn_items and forge_equipment to return item details.
 * Response: { transactions: [...] }
 */
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

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
       LEFT JOIN forge_txn_items i ON i.txn_id = t.txn_id
       LEFT JOIN forge_equipment e ON e.equipment_id = i.equipment_id
       WHERE t.user_id = $1
       GROUP BY t.txn_id, t.department, t.course, t.time_slot, t.txn_date,
                t.lab_room, t.adviser, t.status, t.created_at
       ORDER BY t.txn_date DESC, t.created_at DESC`,
      [userId]
    );

    return res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Transactions fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

module.exports = router;
