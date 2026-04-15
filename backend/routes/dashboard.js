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
    // 1. Active transactions for the current student
    const txnResult = await db.query(
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
               'equipmentId', i.equipment_id,
               'name', e.name,
               'condition', i.condition
             )
           ) FILTER (WHERE i.item_id IS NOT NULL),
           '[]'
         ) AS items
       FROM forge_transactions t
       LEFT JOIN forge_txn_items i ON i.txn_id = t.txn_id
       LEFT JOIN forge_equipment e ON e.equipment_id = i.equipment_id
       WHERE t.user_id = $1
         AND t.status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID')
       GROUP BY t.txn_id
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // 2. All lab rooms
    const roomsResult = await db.query(
      `SELECT
         room_id   AS "roomId",
         room_name AS "roomName",
         department,
         capacity,
         status
       FROM forge_lab_rooms
       ORDER BY room_id`
    );

    // 3. High-demand equipment: items currently borrowed (ACTIVE transactions)
    //    Join to get borrower name, room location, and time slot for progress bar
    //    Also count total units and available units per equipment name
    const equipResult = await db.query(
      `SELECT DISTINCT ON (e.equipment_id)
         e.equipment_id  AS "equipmentId",
         e.name,
         e.status,
         u.full_name      AS "borrowerName",
         t.lab_room       AS "roomLocation",
         t.time_slot      AS "timeSlot",
         t.txn_date       AS "txnDate",
         (SELECT COALESCE(MAX(e2.total_quantity), COUNT(*)) FROM forge_equipment e2 WHERE e2.name = e.name)::int AS "totalUnits",
         (SELECT COUNT(*) FROM forge_equipment e2 WHERE e2.name = e.name AND e2.status = 'AVAILABLE')::int AS "availableUnits"       FROM forge_equipment e
       LEFT JOIN forge_txn_items i  ON i.equipment_id = e.equipment_id
       LEFT JOIN forge_transactions t ON t.txn_id = i.txn_id
                                      AND t.status IN ('ACTIVE', 'PENDING_RETURN')
       LEFT JOIN forge_users u ON u.user_id = t.user_id
       WHERE e.status IN ('AVAILABLE', 'MAINTENANCE')
          OR t.txn_id IS NOT NULL
       ORDER BY e.equipment_id, t.created_at DESC NULLS LAST
       LIMIT 20`
    );

    res.json({
      activeTransactions: txnResult.rows,
      labRooms: roomsResult.rows,
      highDemandEquipment: equipResult.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
