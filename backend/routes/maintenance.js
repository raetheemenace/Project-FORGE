const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/** Map severity → priority for forge_maintenance_tickets */
const SEVERITY_TO_PRIORITY = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
};

/**
 * POST /api/maintenance
 * Submit a maintenance report for a piece of equipment.
 * Atomically inserts one forge_maintenance row and one forge_maintenance_tickets row.
 * Body: { equipmentId, severity, description }
 * Response: { reportId, ticketId, message }
 * Requirements: 6.7
 */
router.post('/', authenticateToken, async (req, res) => {
  // Only admin users can submit maintenance reports
  if (req.user.role !== 'LAB_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const { equipmentId, severity, description } = req.body;

  if (!severity || !VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({
      error: 'Severity is required and must be one of: Low, Medium, High, Critical.',
    });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  const userId = req.user.userId;
  const priority = SEVERITY_TO_PRIORITY[severity];

  let client;
  try {
    client = await db.getConnection();

    await client.query('BEGIN');

    const reportResult = await client.query(
      `INSERT INTO forge_maintenance (equipment_id, user_id, severity, description)
       VALUES ($1, $2, $3, $4)
       RETURNING report_id`,
      [equipmentId || null, userId, severity, description.trim()]
    );

    const reportId = reportResult.rows[0].report_id;

    const ticketResult = await client.query(
      `INSERT INTO forge_maintenance_tickets (report_id, status, priority)
       VALUES ($1, 'OPEN', $2)
       RETURNING ticket_id`,
      [reportId, priority]
    );

    const ticketId = ticketResult.rows[0].ticket_id;

    // Notify the student
    await client.query(
      `INSERT INTO forge_notifications (user_id, type, message) VALUES ($1, 'MAINTENANCE', $2)`,
      [userId, `Your maintenance report (Report #${reportId}) for equipment ${equipmentId || 'N/A'} has been successfully submitted.`]
    );

    await client.query('COMMIT');

    return res.status(201).json({ reportId, ticketId, message: 'Maintenance report submitted successfully.' });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore rollback error */ }
    }
    console.error('Maintenance report error:', err);
    return res.status(500).json({ error: 'Failed to submit maintenance report. Please retry.' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
