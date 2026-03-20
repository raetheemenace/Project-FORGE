const express = require('express');
const oracledb = require('oracledb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });

// GET /api/admin/equipment
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { department, status } = req.query;
  let conn;
  try {
    conn = await getConnection();
    const params = {};
    let sql = `SELECT EQUIPMENT_ID, NAME, DEPARTMENT, STATUS, S3_IMAGE_KEY
               FROM FORGE_EQUIPMENT WHERE 1=1`;
    if (department) { sql += ` AND UPPER(DEPARTMENT) = UPPER(:department)`; params.department = department; }
    if (status)     { sql += ` AND STATUS = :status`; params.status = status; }
    sql += ` ORDER BY DEPARTMENT, NAME`;

    const result = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// POST /api/admin/equipment
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { equipmentId, name, department, imageBase64, mimeType } = req.body;
  if (!equipmentId || !name || !department) {
    return res.status(400).json({ error: 'equipmentId, name, and department are required' });
  }

  let s3Key = null;
  if (imageBase64) {
    s3Key = `equipment/${equipmentId}.jpg`;
    const buf = Buffer.from(imageBase64, 'base64');
    await s3.send(new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET,
      Key:         s3Key,
      Body:        buf,
      ContentType: mimeType || 'image/jpeg',
    }));
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO FORGE_EQUIPMENT (EQUIPMENT_ID, NAME, DEPARTMENT, S3_IMAGE_KEY, STATUS)
       VALUES (:equipmentId, :name, :department, :s3Key, 'AVAILABLE')`,
      { equipmentId, name, department, s3Key }
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'EQUIPMENT_CREATED', 'EQUIPMENT', :equipmentId, :details)`,
      { adminId: req.user.userId, equipmentId, details: `Created: ${name}` }
    );
    await conn.commit();
    res.status(201).json({ equipmentId, message: 'Equipment created' });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.errorNum === 1) return res.status(409).json({ error: 'Equipment ID already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT /api/admin/equipment/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { name, department, status, imageBase64, mimeType } = req.body;
  let conn;
  try {
    conn = await getConnection();

    let s3Key = null;
    if (imageBase64) {
      s3Key = `equipment/${req.params.id}.jpg`;
      const buf = Buffer.from(imageBase64, 'base64');
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.S3_BUCKET,
        Key:         s3Key,
        Body:        buf,
        ContentType: mimeType || 'image/jpeg',
      }));
    }

    const updates = [];
    const params  = { id: req.params.id };
    if (name)       { updates.push('NAME = :name');             params.name = name; }
    if (department) { updates.push('DEPARTMENT = :department'); params.department = department; }
    if (status)     { updates.push('STATUS = :status');         params.status = status; }
    if (s3Key)      { updates.push('S3_IMAGE_KEY = :s3Key');    params.s3Key = s3Key; }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    await conn.execute(
      `UPDATE FORGE_EQUIPMENT SET ${updates.join(', ')} WHERE EQUIPMENT_ID = :id`,
      params
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'EQUIPMENT_UPDATED', 'EQUIPMENT', :targetId, :details)`,
      { adminId: req.user.userId, targetId: req.params.id, details: JSON.stringify(req.body) }
    );
    await conn.commit();
    res.json({ message: 'Equipment updated' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE /api/admin/equipment/:id — soft delete (mark DISPOSED)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE FORGE_EQUIPMENT SET STATUS = 'DISPOSED' WHERE EQUIPMENT_ID = :id`,
      { id: req.params.id }
    );
    await conn.execute(
      `INSERT INTO FORGE_ADMIN_ACTIONS (ADMIN_ID, ACTION_TYPE, TARGET_TYPE, TARGET_ID, DETAILS)
       VALUES (:adminId, 'EQUIPMENT_DISPOSED', 'EQUIPMENT', :targetId, 'Marked as disposed')`,
      { adminId: req.user.userId, targetId: req.params.id }
    );
    await conn.commit();
    res.json({ message: 'Equipment marked as disposed' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
