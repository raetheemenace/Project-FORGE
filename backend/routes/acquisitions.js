// Student Acquisition Requests — POST/GET /api/acquisitions/request
// Students submit requests for new equipment; admins review via admin panel
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const VALID_URGENCIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * POST /api/acquisitions/request
 * Submit a new equipment acquisition request.
 * Body: { equipment_name, department, quantity?, reason, urgency? }
 * Returns: { requestId, message }
 */
router.post('/request', authenticateToken, async (req, res) => {
  const { equipment_name, department, quantity = 1, reason, urgency = 'Medium' } = req.body;
  const userId = req.user.userId;

  if (!equipment_name || !equipment_name.trim()) {
    return res.status(400).json({ error: 'Equipment name is required.' });
  }
  if (!department || !department.trim()) {
    return res.status(400).json({ error: 'Department is required.' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason is required.' });
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }
  if (!VALID_URGENCIES.includes(urgency)) {
    return res.status(400).json({ error: 'Urgency must be one of: Low, Medium, High, Critical.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO forge_acquisition_requests
         (user_id, equipment_name, department, quantity, reason, urgency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING request_id`,
      [userId, equipment_name.trim(), department.trim(), Number(quantity), reason.trim(), urgency]
    );
    return res.status(201).json({
      requestId: result.rows[0].request_id,
      message: 'Acquisition request submitted successfully.',
    });
  } catch (err) {
    console.error('Acquisition request error:', err);
    return res.status(500).json({ error: 'Failed to submit request. Please retry.' });
  }
});

/**
 * GET /api/acquisitions/my-requests
 * Returns the current student's own acquisition requests.
 */
router.get('/my-requests', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await db.query(
      `SELECT request_id, equipment_name, department, quantity, reason, urgency,
              status, admin_notes, created_at
       FROM forge_acquisition_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('My requests fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch your requests.' });
  }
});

module.exports = router;
