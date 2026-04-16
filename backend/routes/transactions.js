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

    // Insert each item: update equipment, log borrow, create txn item
    for (const item of items) {
      if (!item.equipmentId) continue;

      // 1. Insert transaction item
      await client.query(
        `INSERT INTO forge_txn_items (txn_id, equipment_id, condition)
         VALUES ($1, $2, $3)`,
        [txnId, item.equipmentId, item.condition || null]
      );

      // 2. Get current condition and status for borrow log
      const equipResult = await client.query(
        `SELECT status, total_units, available_units FROM forge_equipment WHERE equipment_id = $1 FOR UPDATE`,
        [item.equipmentId]
      );
      const currentStatus = equipResult.rows[0]?.status || 'AVAILABLE';

      // 3. Insert borrow log entry (before update)
      await client.query(
        `INSERT INTO forge_borrow_log (user_id, equipment_id, txn_id, condition_before, borrowed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, item.equipmentId, txnId, item.condition || null]
      );

      // 4. Update equipment atomically
      await client.query(
        `UPDATE forge_equipment
         SET status = CASE WHEN available_units <= 1 THEN 'BORROWED' ELSE status END,
             available_units = available_units - 1
         WHERE equipment_id = $1 AND available_units > 0`,
        [item.equipmentId]
      );
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
                'name',         COALESCE(e.name, CASE WHEN e.equipment_id IS NOT NULL THEN 'Unnamed Equipment' ELSE 'Equipment ' || i.equipment_id END)
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

/**
 * POST /api/transactions/:txnId/return
 * Mark transaction as returned and increment equipment available units
 */
router.post('/:txnId/return', authenticateToken, async (req, res) => {
  const { txnId } = req.params;
  const userId = req.user.userId;
  const { conditionAfter, remarks } = req.body;  // Optional fields

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    // Verify transaction belongs to user
    const txnResult = await client.query(
      `SELECT status FROM forge_transactions WHERE txn_id = $1 AND user_id = $2`,
      [txnId, userId]
    );

    if (txnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (txnResult.rows[0].status === 'RETURNED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction already returned' });
    }

    // Get all items in this transaction
    const itemsResult = await client.query(
      `SELECT item_id, equipment_id FROM forge_txn_items WHERE txn_id = $1`,
      [txnId]
    );

    // For each item: find the corresponding borrow_log entry, then create return_log
    for (const item of itemsResult.rows) {
      if (!item.equipment_id) continue;

      // Find the most recent borrow log for this equipment + transaction (should exist)
      const borrowLogResult = await client.query(
        `SELECT borrow_id FROM forge_borrow_log
         WHERE txn_id = $1 AND equipment_id = $2
         ORDER BY borrowed_at DESC LIMIT 1
         FOR UPDATE`,
        [txnId, item.equipment_id]
      );

      if (borrowLogResult.rows.length > 0) {
        const borrowId = borrowLogResult.rows[0].borrow_id;

        // Insert return log entry
        await client.query(
          `INSERT INTO forge_return_log (borrow_id, user_id, equipment_id, condition_after, remarks_in)
           VALUES ($1, $2, $3, $4, $5)`,
          [borrowId, userId, item.equipment_id, conditionAfter || null, remarks || null]
        );
      }

      // Increment available units for each returned item
      await client.query(
        `UPDATE forge_equipment
         SET status = CASE WHEN available_units + 1 >= total_units THEN 'AVAILABLE' ELSE status END,
             available_units = available_units + 1
         WHERE equipment_id = $1`,
        [item.equipment_id]
      );
    }

    // Update transaction status
    await client.query(
      `UPDATE forge_transactions SET status = 'RETURNED' WHERE txn_id = $1`,
      [txnId]
    );

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Equipment returned successfully' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Return transaction error:', err);
    return res.status(500).json({ error: 'Failed to process return' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
