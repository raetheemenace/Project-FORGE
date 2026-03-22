// Admin Analytics Route
// GET /api/admin/analytics — summary statistics for the Admin Dashboard
// Requires LAB_ADMIN role (Requirements: 15.1, 15.10)

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

/**
 * GET /api/admin/analytics
 * Returns summary statistics:
 *   - activeTransactions : count of ACTIVE transactions
 *   - openTickets        : count of OPEN maintenance tickets
 *   - availableEquipment : count of equipment with status AVAILABLE
 *   - registeredUsers    : total registered user count
 */
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM forge_transactions  WHERE status = 'ACTIVE')          AS "activeTransactions",
        (SELECT COUNT(*) FROM forge_maintenance_tickets WHERE status = 'OPEN')       AS "openTickets",
        (SELECT COUNT(*) FROM forge_equipment    WHERE status = 'AVAILABLE')         AS "availableEquipment",
        (SELECT COUNT(*) FROM forge_users)                                           AS "registeredUsers"
    `);

    const row = result.rows[0];
    return res.json({
      activeTransactions: parseInt(row.activeTransactions, 10),
      openTickets:        parseInt(row.openTickets, 10),
      availableEquipment: parseInt(row.availableEquipment, 10),
      registeredUsers:    parseInt(row.registeredUsers, 10),
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    return res.status(500).json({ error: 'Failed to load analytics data.' });
  }
});

module.exports = router;
