const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// GET /api/admin/transactions
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { status, department, studentId, dateFrom, dateTo } = req.query;
  let conn;
  try {
    conn = await getConnection();
    const params = {};
    let sql = `
      SELECT t.TXN_ID, t.DEPARTMENT, t.COURSE, t.TIME_SLOT, t.TXN_DATE,
             t.LAB_ROOM, t.ADVISER, t.STATUS, t.CREATED_AT,
             u.FULL_NAME, u.STUDENT_ID, u.USERNAME
      FROM FORGE_TRANSACTIONS t
      JOIN FORGE_USERS u ON t.USER_ID = u.USER_ID
      WHERE 1=1`;

    if (status)     { sql += ` AND t.STATUS = :status`;                         params.status = status; }
    if (department) { sql += ` AND UPPER(t.DEPARTMENT) = UPPER(:department)`;   params.department = department; }
    if (studentId)  { sql += ` AND u.STUDENT_ID = :studentId`;                  params.studentId = studentId; }
    if (dateFrom)   { sql += ` AND t.TXN_DATE >= TO_DATE(:dateFrom,'YYYY-MM-DD')`; params.dateFrom = dateFrom; }
    if (dateTo)     { sql += ` AND t.TXN_DATE <= TO_DATE(:dateTo,'YYYY-MM-DD')`;   params.dateTo = dateTo; }

    sql += ` ORDER BY t.CREATED_AT DESC`;

    const result = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    // Attach items to each transaction
    const transactions = [];
    for (const txn of result.rows) {
      const items = await conn.execute(
        `SELECT i.ITEM_ID, i.EQUIPMENT_ID, e.NAME, i.CONDITION
         FROM FORGE_TXN_ITEMS i
         JOIN FORGE_EQUIPMENT e ON i.EQUIPMENT_ID = e.EQUIPMENT_ID
         WHERE i.TXN_ID = :txnId`,
        { txnId: txn.TXN_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      transactions.push({ ...txn, items: items.rows });
    }

    res.json(transactions);
  } catch (err) {
    console.error('Admin list transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// PATCH /api/admin/transactions/:id — override transaction status
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  let conn;
  try {
    conn = await getConnection();

    const check = await conn.execute(
      `SELECT TXN_ID FROM FORGE_TRANSACTIONS WHERE TXN_ID = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    await conn.execute(
      `UPDATE FORGE_TRANSACTIONS SET STATUS = :status WHERE TXN_ID = :id`,
      { status, id: req.params.id }
    );

    // If returned, free up equipment
    if (status === 'RETURNED') {
      await conn.execute(
        `UPDATE FORGE_EQUIPMENT e SET e.STATUS = 'AVAILABLE'
         WHERE e.EQUIPMENT_ID IN (
           SELECT EQUIPMENT_ID FROM FORGE_TXN_ITEMS WHERE TXN_ID = :id
         )`,
        { id: req.params.id }
      );
    }

    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'TRANSACTION_OVERRIDDEN', 'TRANSACTION', :targetId, :details)`,
      { adminId: req.user.userId, targetId: req.params.id, details: `Status set to ${status}` }
    );
    await conn.commit();
    res.json({ message: 'Transaction status updated' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Admin update transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
