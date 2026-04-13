// Admin Maintenance Ticket Routes
// GET  /api/admin/tickets        — list all tickets
// POST /api/admin/tickets        — create ticket from a maintenance report
// PATCH /api/admin/tickets/:id   — update status / assignment / resolution

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const ALLOWED_TRANSITIONS = {
  OPEN:        ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'TICKET', $3, $4)`,
    [adminId, actionType, String(targetId), JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/tickets
// Query params: status, severity, assigned_to, date_from, date_to, search
// ---------------------------------------------------------------------------
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const { status, severity, assigned_to, date_from, date_to, search } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status)      { conditions.push(`t.status = $${idx++}`); params.push(status); }
    if (severity)    { conditions.push(`m.severity = $${idx++}`); params.push(severity); }
    if (assigned_to) { conditions.push(`t.assigned_to = $${idx++}`); params.push(Number(assigned_to)); }
    if (date_from)   { conditions.push(`t.created_at >= $${idx++}`); params.push(date_from); }
    if (date_to)     { conditions.push(`t.created_at <= $${idx++}`); params.push(date_to); }
    if (search) {
      conditions.push(`(m.equipment_id ILIKE $${idx} OR m.description ILIKE $${idx})`);
      params.push('%' + search + '%');
      idx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await db.query(
      `SELECT
         t.ticket_id, t.report_id, t.assigned_to, t.status, t.priority,
         t.resolution, t.resolved_at, t.created_at,
         m.equipment_id, m.severity, m.description AS report_description,
         m.created_at AS report_created_at,
         reporter.user_id   AS reporter_id,
         reporter.full_name AS reporter_name,
         assignee.full_name AS assignee_name,
         e.name             AS equipment_name
       FROM forge_maintenance_tickets t
       JOIN forge_maintenance m       ON m.report_id   = t.report_id
       JOIN forge_users reporter      ON reporter.user_id = m.user_id
       LEFT JOIN forge_users assignee ON assignee.user_id = t.assigned_to
       LEFT JOIN forge_equipment e    ON e.equipment_id   = m.equipment_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );
    return res.json({ tickets: result.rows });
  } catch (err) {
    console.error('Admin list tickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/tickets
// Body: { report_id, priority?, assigned_to? }
// ---------------------------------------------------------------------------
router.post('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { report_id, priority, assigned_to } = req.body;
  const adminId = req.user.userId;

  if (!report_id) return res.status(400).json({ error: 'report_id is required.' });

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const reportCheck = await client.query(
      'SELECT report_id FROM forge_maintenance WHERE report_id = $1', [report_id]
    );
    if (reportCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maintenance report not found.' });
    }

    const dupCheck = await client.query(
      'SELECT ticket_id FROM forge_maintenance_tickets WHERE report_id = $1', [report_id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A ticket already exists for this report.' });
    }

    if (assigned_to) {
      const assigneeCheck = await client.query(
        'SELECT user_id FROM forge_users WHERE user_id = $1', [assigned_to]
      );
      if (assigneeCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assigned user not found.' });
      }
    }

    const insertResult = await client.query(
      `INSERT INTO forge_maintenance_tickets (report_id, assigned_to, status, priority)
       VALUES ($1, $2, 'OPEN', $3) RETURNING ticket_id`,
      [report_id, assigned_to || null, priority || null]
    );

    const ticketId = insertResult.rows[0].ticket_id;
    await logAdminAction(client, adminId, 'TICKET_CREATED', ticketId, { ticketId, reportId: report_id });
    await client.query('COMMIT');

    return res.status(201).json({ ticketId, message: 'Ticket created successfully.' });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('Admin create ticket error:', err);
    return res.status(500).json({ error: 'Failed to create ticket.' });
  } finally {
    if (client) client.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/tickets/:id
// Body: { status?, assigned_to?, resolution?, priority? }
// ---------------------------------------------------------------------------
router.patch('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status, assigned_to, resolution, priority } = req.body;
  const adminId = req.user.userId;

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM forge_maintenance_tickets WHERE ticket_id = $1', [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = existing.rows[0];

    if (status && status !== ticket.status) {
      if (!VALID_STATUSES.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
      }
      const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
      if (!allowed.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Invalid transition from ${ticket.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}.`,
        });
      }
    }

    if (assigned_to) {
      const assigneeCheck = await client.query(
        'SELECT user_id FROM forge_users WHERE user_id = $1', [assigned_to]
      );
      if (assigneeCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assigned user not found.' });
      }
    }

    const newStatus     = status      || ticket.status;
    const newAssignedTo = assigned_to !== undefined ? assigned_to : ticket.assigned_to;
    const newResolution = resolution  !== undefined ? resolution  : ticket.resolution;
    const newPriority   = priority    !== undefined ? priority    : ticket.priority;
    const resolvedAt    = newStatus === 'RESOLVED' && ticket.status !== 'RESOLVED' ? new Date() : ticket.resolved_at;

    await client.query(
      `UPDATE forge_maintenance_tickets
       SET status = $1, assigned_to = $2, resolution = $3, priority = $4, resolved_at = $5
       WHERE ticket_id = $6`,
      [newStatus, newAssignedTo, newResolution, newPriority, resolvedAt, id]
    );

    // Notify the student who filed the maintenance report
    if (status && status !== ticket.status) {
      const TICKET_MESSAGES = {
        IN_PROGRESS: (eqId) => `Your maintenance report for equipment ${eqId} is now being worked on.`,
        RESOLVED:    (eqId) => `Your maintenance report for equipment ${eqId} has been resolved.`,
        CLOSED:      (eqId) => `Your maintenance ticket for equipment ${eqId} has been closed.`,
      };
      const msgFn = TICKET_MESSAGES[newStatus];
      if (msgFn) {
        const reportRow = await client.query(
          `SELECT m.user_id, m.equipment_id FROM forge_maintenance m
           JOIN forge_maintenance_tickets t ON t.report_id = m.report_id
           WHERE t.ticket_id = $1`,
          [id]
        );
        if (reportRow.rows.length > 0) {
          const { user_id, equipment_id } = reportRow.rows[0];
          await client.query(
            `INSERT INTO forge_notifications (user_id, type, message) VALUES ($1, 'MAINTENANCE', $2)`,
            [user_id, msgFn(equipment_id || 'unknown')]
          );
        }
      }
    }

    await logAdminAction(client, adminId, 'TICKET_UPDATED', id, {
      previousStatus: ticket.status, newStatus, assignedTo: newAssignedTo,
    });

    await client.query('COMMIT');
    return res.json({ message: 'Ticket updated successfully.', ticketId: id, status: newStatus });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('Admin update ticket error:', err);
    return res.status(500).json({ error: 'Failed to update ticket.' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
