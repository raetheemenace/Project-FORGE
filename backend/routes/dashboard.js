const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // Active transactions for this student
    const txnResult = await conn.execute(
      `SELECT t.TXN_ID, t.DEPARTMENT, t.COURSE, t.TIME_SLOT, t.TXN_DATE, t.LAB_ROOM, t.STATUS,
              COUNT(i.ITEM_ID) AS ITEM_COUNT
       FROM FORGE_TRANSACTIONS t
       LEFT JOIN FORGE_TXN_ITEMS i ON t.TXN_ID = i.TXN_ID
       WHERE t.USER_ID = :userId AND t.STATUS IN ('ACTIVE', 'PENDING_RETURN')
       GROUP BY t.TXN_ID, t.DEPARTMENT, t.COURSE, t.TIME_SLOT, t.TXN_DATE, t.LAB_ROOM, t.STATUS
       ORDER BY t.CREATED_AT DESC`,
      { userId: req.user.userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Lab rooms
    const roomResult = await conn.execute(
      `SELECT ROOM_ID, ROOM_NAME, DEPARTMENT, CAPACITY, STATUS
       FROM FORGE_LAB_ROOMS
       WHERE STATUS != 'INACTIVE'
       ORDER BY ROOM_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // High-demand equipment (BORROWED or AVAILABLE, non-disposed)
    const equipResult = await conn.execute(
      `SELECT e.EQUIPMENT_ID, e.NAME, e.DEPARTMENT, e.STATUS,
              u.FULL_NAME AS BORROWER_NAME,
              t.LAB_ROOM
       FROM FORGE_EQUIPMENT e
       LEFT JOIN FORGE_TXN_ITEMS i ON e.EQUIPMENT_ID = i.EQUIPMENT_ID
       LEFT JOIN FORGE_TRANSACTIONS t ON i.TXN_ID = t.TXN_ID AND t.STATUS = 'ACTIVE'
       LEFT JOIN FORGE_USERS u ON t.USER_ID = u.USER_ID
       WHERE e.STATUS != 'DISPOSED'
         AND e.DEPARTMENT IN ('Engineering', 'Physics')
       ORDER BY e.DEPARTMENT, e.NAME`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      activeTransactions: txnResult.rows,
      labRooms:           roomResult.rows,
      highDemandEquipment: equipResult.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
