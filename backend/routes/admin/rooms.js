// Admin Lab Room CRUD Routes
// GET/POST/PUT/DELETE /api/admin/rooms
// Requires LAB_ADMIN role (Requirements: 15.7, 15.9)

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: log admin action
// ---------------------------------------------------------------------------
async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'LAB_ROOM', $3, $4)`,
    [adminId, actionType, String(targetId), JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/rooms — list all rooms
// ---------------------------------------------------------------------------
router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT room_id, room_name, department, capacity, status
       FROM forge_lab_rooms
       ORDER BY room_id ASC`
    );
    return res.json({ rooms: result.rows });
  } catch (err) {
    console.error('Admin list rooms error:', err);
    return res.status(500).json({ error: 'Failed to fetch lab rooms.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/rooms — create a new lab room
// Body: { roomId, roomName, department, capacity?, status? }
// ---------------------------------------------------------------------------
router.post('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { roomId, roomName, department, capacity, status } = req.body;
  const adminId = req.user.userId;

  if (!roomId || !roomId.trim()) {
    return res.status(400).json({ error: 'Room ID is required.' });
  }
  if (!roomName || !roomName.trim()) {
    return res.status(400).json({ error: 'Room name is required.' });
  }
  if (!department || !department.trim()) {
    return res.status(400).json({ error: 'Department is required.' });
  }

  const roomStatus = status || 'ACTIVE';
  const roomCapacity = capacity ? Number(capacity) : null;

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    // Check for duplicate room ID
    const existing = await client.query(
      'SELECT 1 FROM forge_lab_rooms WHERE room_id = $1',
      [roomId.trim()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A room with this ID already exists.' });
    }

    await client.query(
      `INSERT INTO forge_lab_rooms (room_id, room_name, department, capacity, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [roomId.trim(), roomName.trim(), department.trim(), roomCapacity, roomStatus]
    );

    await logAdminAction(client, adminId, 'ROOM_CREATED', roomId.trim(), {
      roomId: roomId.trim(),
      roomName: roomName.trim(),
      department: department.trim(),
      capacity: roomCapacity,
      status: roomStatus,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      roomId: roomId.trim(),
      message: 'Lab room created successfully.',
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    console.error('Admin create room error:', err);
    return res.status(500).json({ error: 'Failed to create lab room.' });
  } finally {
    if (client) client.release();
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/rooms/:id — update a lab room
// Body: { roomName?, department?, capacity?, status? }
// ---------------------------------------------------------------------------
router.put('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { roomName, department, capacity, status } = req.body;
  const adminId = req.user.userId;

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM forge_lab_rooms WHERE room_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lab room not found.' });
    }

    const current = existing.rows[0];
    const updatedName = roomName ? roomName.trim() : current.room_name;
    const updatedDept = department ? department.trim() : current.department;
    const updatedCapacity = capacity !== undefined ? Number(capacity) : current.capacity;
    const updatedStatus = status || current.status;

    await client.query(
      `UPDATE forge_lab_rooms
       SET room_name = $1, department = $2, capacity = $3, status = $4
       WHERE room_id = $5`,
      [updatedName, updatedDept, updatedCapacity, updatedStatus, id]
    );

    await logAdminAction(client, adminId, 'ROOM_UPDATED', id, {
      roomName: updatedName,
      department: updatedDept,
      capacity: updatedCapacity,
      status: updatedStatus,
    });

    await client.query('COMMIT');

    return res.json({ message: 'Lab room updated successfully.' });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    console.error('Admin update room error:', err);
    return res.status(500).json({ error: 'Failed to update lab room.' });
  } finally {
    if (client) client.release();
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/rooms/:id — deactivate a lab room (set status = INACTIVE)
// ---------------------------------------------------------------------------
router.delete('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.userId;

  let client;
  try {
    client = await db.getConnection();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT room_id, room_name FROM forge_lab_rooms WHERE room_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lab room not found.' });
    }

    await client.query(
      `UPDATE forge_lab_rooms SET status = 'INACTIVE' WHERE room_id = $1`,
      [id]
    );

    await logAdminAction(client, adminId, 'ROOM_DEACTIVATED', id, {
      roomId: id,
      roomName: existing.rows[0].room_name,
    });

    await client.query('COMMIT');

    return res.json({ message: 'Lab room deactivated successfully.' });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    console.error('Admin deactivate room error:', err);
    return res.status(500).json({ error: 'Failed to deactivate lab room.' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
