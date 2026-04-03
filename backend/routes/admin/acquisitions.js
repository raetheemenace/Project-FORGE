// Admin Acquisitions CRUD Routes
// GET/POST /api/admin/acquisitions
// GET /api/admin/acquisitions/:id
// POST /api/admin/acquisitions/:id/items
// Requires LAB_ADMIN role

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { getUniqueEquipmentId } = require('./equipment');

// ---------------------------------------------------------------------------
// GET /api/admin/acquisitions/requests — list all student acquisition requests
// ---------------------------------------------------------------------------

router.get('/requests', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         r.request_id,
         r.equipment_name,
         r.equipment_id,
         r.department,
         r.quantity,
         r.reason,
         r.urgency,
         r.status,
         r.admin_notes,
         r.created_at,
         u.full_name AS requested_by,
         u.student_id,
         u.program
       FROM forge_acquisition_requests r
       JOIN forge_users u ON u.user_id = r.user_id
       ORDER BY
         CASE r.urgency WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         r.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin list requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch acquisition requests.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/acquisitions/requests/:id — update request status
// Body: { status, admin_notes? }
// ---------------------------------------------------------------------------

router.patch('/requests/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  const VALID = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];

  if (!status || !VALID.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID.join(', ')}.` });
  }

  try {
    const result = await db.query(
      `UPDATE forge_acquisition_requests
       SET status = $1, admin_notes = $2, updated_at = NOW()
       WHERE request_id = $3
       RETURNING request_id`,
      [status, admin_notes || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    return res.json({ message: 'Request updated.' });
  } catch (err) {
    console.error('Admin update request error:', err);
    return res.status(500).json({ error: 'Failed to update request.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/acquisitions — list all acquisitions
// ---------------------------------------------------------------------------

router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         a.acquisition_id,
         a.supplier_name,
         a.acquisition_date,
         a.notes,
         u.full_name AS created_by_name,
         COUNT(ai.item_id)::int AS item_count
       FROM forge_acquisitions a
       JOIN forge_users u ON u.user_id = a.created_by
       LEFT JOIN forge_acquisition_items ai ON ai.acquisition_id = a.acquisition_id
       GROUP BY a.acquisition_id, u.full_name
       ORDER BY a.acquisition_date DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin list acquisitions error:', err);
    return res.status(500).json({ error: 'Failed to fetch acquisitions.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/acquisitions — create acquisition record
// Body: { supplier_name, acquisition_date, notes? }
// ---------------------------------------------------------------------------

router.post('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { supplier_name, acquisition_date, notes } = req.body;

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required.' });
  }
  if (!acquisition_date) {
    return res.status(400).json({ error: 'Acquisition date is required.' });
  }

  const adminId = req.user.userId;

  try {
    const result = await db.query(
      `INSERT INTO forge_acquisitions (supplier_name, acquisition_date, notes, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING acquisition_id`,
      [supplier_name.trim(), acquisition_date, notes || null, adminId]
    );

    const acquisitionId = result.rows[0].acquisition_id;

    await db.query(
      `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
       VALUES ($1, 'ACQUISITION_CREATED', 'ACQUISITION', $2, $3)`,
      [adminId, acquisitionId, JSON.stringify({ supplier_name: supplier_name.trim(), acquisition_date })]
    );

    return res.status(201).json({ acquisitionId });
  } catch (err) {
    console.error('Admin create acquisition error:', err);
    return res.status(500).json({ error: 'Failed to create acquisition.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/acquisitions/:id — acquisition detail with items
// ---------------------------------------------------------------------------

router.get('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const acqResult = await db.query(
      `SELECT
         a.acquisition_id,
         a.supplier_name,
         a.acquisition_date,
         a.notes,
         a.created_at,
         u.full_name AS created_by_name
       FROM forge_acquisitions a
       JOIN forge_users u ON u.user_id = a.created_by
       WHERE a.acquisition_id = $1`,
      [id]
    );

    if (acqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Acquisition not found.' });
    }

    const itemsResult = await db.query(
      `SELECT
         ai.item_id,
         ai.equipment_id,
         e.name,
         e.department,
         e.status,
         ai.initial_condition,
         ai.assigned_room
       FROM forge_acquisition_items ai
       JOIN forge_equipment e ON e.equipment_id = ai.equipment_id
       WHERE ai.acquisition_id = $1
       ORDER BY ai.item_id ASC`,
      [id]
    );

    return res.json({
      acquisition: acqResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error('Admin get acquisition detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch acquisition.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/acquisitions/:id/items — batch add items
// Body: [{ name, department, initial_condition?, assigned_room? }, ...]
// ---------------------------------------------------------------------------

router.post('/:id/items', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const items = req.body;
  const adminId = req.user.userId;

  // Validate acquisition exists
  try {
    const acqCheck = await db.query(
      'SELECT acquisition_id FROM forge_acquisitions WHERE acquisition_id = $1',
      [id]
    );
    if (acqCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Acquisition not found.' });
    }
  } catch (err) {
    console.error('Acquisition lookup error:', err);
    return res.status(500).json({ error: 'Failed to verify acquisition.' });
  }

  // Validate each item
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required.' });
  }
  for (const item of items) {
    if (!item.name || !item.name.trim()) {
      return res.status(400).json({ error: 'Equipment name is required for all items.' });
    }
    if (!item.department || !item.department.trim()) {
      return res.status(400).json({ error: 'Department is required for all items.' });
    }
  }

  const client = await db.getConnection();
  try {
    await client.query('BEGIN');

    const equipmentIds = [];

    for (const item of items) {
      const equipmentId = await getUniqueEquipmentId(client);
      const assignedRoom = item.assigned_room || null;
      const initialCondition = item.initial_condition || null;

      await client.query(
        `INSERT INTO forge_equipment (equipment_id, name, department, status)
         VALUES ($1, $2, $3, 'AVAILABLE')`,
        [equipmentId, item.name.trim(), item.department.trim()]
      );

      await client.query(
        `INSERT INTO forge_acquisition_items (acquisition_id, equipment_id, initial_condition, assigned_room)
         VALUES ($1, $2, $3, $4)`,
        [id, equipmentId, initialCondition, assignedRoom]
      );

      await client.query(
        `INSERT INTO forge_equipment_events (equipment_id, event_type, performed_by, to_location)
         VALUES ($1, 'PROCURED', $2, $3)`,
        [equipmentId, adminId, assignedRoom]
      );

      equipmentIds.push(equipmentId);
    }

    await client.query('COMMIT');
    return res.status(201).json({ equipmentIds });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin batch add items error:', err);
    return res.status(500).json({ error: 'Failed to add items. No changes were saved.' });
  } finally {
    client.release();
  }
});

module.exports = router;
