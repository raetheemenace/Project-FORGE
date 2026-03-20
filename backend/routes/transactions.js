const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { generateTxnId } = require('../utils/txnId');

const router = express.Router();

// GET /api/transactions — list student's transactions ordered by date desc
router.get('/', verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const txnResult = await conn.execute(
      `SELECT t.TXN_ID, t.DEPARTMENT, t.COURSE, t.TIME_SLOT, t.TXN_DATE,
              t.LAB_ROOM, t.ADVISER, t.STATUS, t.CREATED_AT
       FROM FORGE_TRANSACTIONS t
       WHERE t.USER_ID = :userId
       ORDER BY t.TXN_DATE DESC, t.CREATED_AT DESC`,
      { userId: req.user.userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Fetch items for each transaction
    const transactions = [];
    for (const txn of txnResult.rows) {
      const itemResult = await conn.execute(
        `SELECT i.ITEM_ID, i.EQUIPMENT_ID, e.NAME, i.CONDITION
         FROM FORGE_TXN_ITEMS i
         JOIN FORGE_EQUIPMENT e ON i.EQUIPMENT_ID = e.EQUIPMENT_ID
         WHERE i.TXN_ID = :txnId`,
        { txnId: txn.TXN_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      transactions.push({ ...txn, items: itemResult.rows });
    }

    res.json(transactions);
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// POST /api/transactions — create a new borrowing transaction (ACID)
router.post('/', verifyToken, async (req, res) => {
  const { department, course, timeSlot, txnDate, labRoom, adviser, items } = req.body;

  if (!department || !course || !timeSlot || !txnDate || !labRoom || !adviser) {
    return res.status(400).json({ error: 'All session fields are required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one equipment item is required' });
  }

  let conn;
  try {
    conn = await getConnection();

    // Lock equipment rows to prevent concurrent checkout of same item
    for (const item of items) {
      const lockResult = await conn.execute(
        `SELECT STATUS FROM FORGE_EQUIPMENT
         WHERE EQUIPMENT_ID = :equipmentId FOR UPDATE NOWAIT`,
        { equipmentId: item.equipmentId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (lockResult.rows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: `Equipment ${item.equipmentId} not found` });
      }
      if (lockResult.rows[0].STATUS !== 'AVAILABLE') {
        await conn.rollback();
        return res.status(409).json({
          error: `Equipment ${item.equipmentId} is not available`,
          equipmentId: item.equipmentId,
        });
      }
    }

    const txnId = await generateTxnId();
    const parsedDate = new Date(txnDate);

    // Insert transaction
    await conn.execute(
      `INSERT INTO FORGE_TRANSACTIONS
         (TXN_ID, USER_ID, DEPARTMENT, COURSE, TIME_SLOT, TXN_DATE, LAB_ROOM, ADVISER, STATUS)
       VALUES
         (:txnId, :userId, :department, :course, :timeSlot, :txnDate, :labRoom, :adviser, 'ACTIVE')`,
      {
        txnId,
        userId:     req.user.userId,
        department,
        course,
        timeSlot,
        txnDate:    parsedDate,
        labRoom,
        adviser,
      }
    );

    // Insert items and mark equipment as BORROWED
    for (const item of items) {
      await conn.execute(
        `INSERT INTO FORGE_TXN_ITEMS (TXN_ID, EQUIPMENT_ID, CONDITION)
         VALUES (:txnId, :equipmentId, :condition)`,
        { txnId, equipmentId: item.equipmentId, condition: item.condition || 'Good' }
      );
      await conn.execute(
        `UPDATE FORGE_EQUIPMENT SET STATUS = 'BORROWED' WHERE EQUIPMENT_ID = :equipmentId`,
        { equipmentId: item.equipmentId }
      );
    }

    await conn.commit();
    res.status(201).json({ txnId, message: 'Transaction created successfully' });
  } catch (err) {
    if (conn) await conn.rollback();
    // ORA-00054: resource busy (NOWAIT lock failed)
    if (err.errorNum === 54) {
      return res.status(409).json({ error: 'Equipment is being checked out by another user. Please try again.' });
    }
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
