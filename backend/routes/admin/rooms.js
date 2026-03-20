const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// GET /api/admin/rooms
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT ROOM_ID, ROOM_NAME, DEPARTMENT, CAPACITY, STATUS
       FROM FORGE_LAB_ROOMS ORDER BY ROOM_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// POST /api/admin/rooms
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { roomId, roomName, department, capacity } = req.body;
  if (!roomId || !roomName || !department) {
    return res.status(400).json({ error: 'roomId, roomName, and department are required' });
  }
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO FORGE_LAB_ROOMS (ROOM_ID, ROOM_NAME, DEPARTMENT, CAPACITY, STATUS)
       VALUES (:roomId, :roomName, :department, :capacity, 'ACTIVE')`,
      { roomId, roomName, department, capacity: capacity || null }
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'ROOM_CREATED', 'ROOM', :targetId, :details)`,
      { adminId: req.user.userId, targetId: roomId, details: `Created: ${roomName}` }
    );
    await conn.commit();
    res.status(201).json({ roomId, message: 'Lab room created' });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.errorNum === 1) return res.status(409).json({ error: 'Room ID already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT /api/admin/rooms/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { roomName, department, capacity, status } = req.body;
  const updates = [];
  const params  = { id: req.params.id };
  if (roomName)   { updates.push('ROOM_NAME = :roomName');     params.roomName = roomName; }
  if (department) { updates.push('DEPARTMENT = :department');  params.department = department; }
  if (capacity)   { updates.push('CAPACITY = :capacity');      params.capacity = capacity; }
  if (status)     { updates.push('STATUS = :status');          params.status = status; }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE FORGE_LAB_ROOMS SET ${updates.join(', ')} WHERE ROOM_ID = :id`,
      params
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'ROOM_UPDATED', 'ROOM', :targetId, :details)`,
      { adminId: req.user.userId, targetId: req.params.id, details: JSON.stringify(req.body) }
    );
    await conn.commit();
    res.json({ message: 'Lab room updated' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE /api/admin/rooms/:id — deactivate
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE FORGE_LAB_ROOMS SET STATUS = 'INACTIVE' WHERE ROOM_ID = :id`,
      { id: req.params.id }
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'ROOM_DEACTIVATED', 'ROOM', :targetId, 'Marked as inactive')`,
      { adminId: req.user.userId, targetId: req.params.id }
    );
    await conn.commit();
    res.json({ message: 'Lab room deactivated' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
