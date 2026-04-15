// Dashboard Routes
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard
 * Fetch dashboard data: active transactions, lab rooms, high-demand equipment
 * Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Test database connection
    await db.query('SELECT 1');

    // 1. Active transactions for the current student
    const txnResult = await db.query(`
      SELECT
        t.txn_id,
        t.department,
        t.course,
        t.time_slot,
        t.txn_date,
        t.lab_room,
        t.adviser,
        t.status,
        t.created_at
      FROM forge_transactions t
      WHERE t.user_id = $1
        AND t.status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID')
      ORDER BY t.created_at DESC
    `, [userId]);

    // 2. All lab rooms
    const roomsResult = await db.query(`
      SELECT
        room_id   AS "roomId",
        room_name AS "roomName",
        department,
        capacity,
        status
      FROM forge_lab_rooms
      ORDER BY room_id
    `);

    // 3. High-demand equipment
    const equipResult = await db.query(`
      SELECT
        e.equipment_id  AS "equipmentId",
        e.name,
        e.department,
        e.status
      FROM forge_equipment e
      ORDER BY e.equipment_id
      LIMIT 100
    `);

    res.json({
      activeTransactions: txnResult.rows,
      labRooms: roomsResult.rows,
      highDemandEquipment: equipResult.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error, error.message, error.stack);
    res.status(200).json({
      activeTransactions: [],
      labRooms: [],
      highDemandEquipment: [],
    });
  }
});

module.exports = router;
