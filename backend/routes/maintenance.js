const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * POST /api/maintenance
 * Submit a maintenance report for a piece of equipment.
 * Body: { equipmentId, severity, description }
 * Response: { reportId, message }
 * Requirements: 10.5, 10.6
 */
router.post('/', authenticateToken, async (req, res) => {
  const { equipmentId, severity, description } = req.body;

  // Validate severity and description (req 10.4, 10.5)
  if (!severity || !VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({
      error: 'Severity is required and must be one of: Low, Medium, High, Critical.',
    });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  const userId = req.user.userId;

  try {
    const result = await db.query(
      `INSERT INTO forge_maintenance (equipment_id, user_id, severity, description)
       VALUES ($1, $2, $3, $4)
       RETURNING report_id`,
      [equipmentId || null, userId, severity, description.trim()]
    );

    const reportId = result.rows[0].report_id;
    return res.status(201).json({ reportId, message: 'Maintenance report submitted successfully.' });
  } catch (err) {
    console.error('Maintenance report error:', err);
    return res.status(500).json({ error: 'Failed to submit maintenance report. Please retry.' });
  }
});

module.exports = router;
