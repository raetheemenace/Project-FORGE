const express = require('express');
const oracledb = require('oracledb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getConnection } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });

// GET /api/equipment — list equipment (optionally filter by department)
router.get('/', verifyToken, async (req, res) => {
  const { department } = req.query;
  let conn;
  try {
    conn = await getConnection();
    const params = {};
    let sql = `SELECT EQUIPMENT_ID, NAME, DEPARTMENT, STATUS, S3_IMAGE_KEY
               FROM FORGE_EQUIPMENT WHERE STATUS != 'DISPOSED'`;
    if (department) {
      sql += ` AND UPPER(DEPARTMENT) = UPPER(:department)`;
      params.department = department;
    }
    sql += ` ORDER BY DEPARTMENT, NAME`;

    const result = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('List equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// GET /api/equipment/image-url/:id — generate pre-signed S3 URL (7-day expiry)
router.get('/image-url/:id', verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT S3_IMAGE_KEY FROM FORGE_EQUIPMENT WHERE EQUIPMENT_ID = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0 || !result.rows[0].S3_IMAGE_KEY) {
      return res.status(404).json({ error: 'No image found for this equipment' });
    }

    const key = result.rows[0].S3_IMAGE_KEY;
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days

    res.json({ url, expiresIn: '7 days' });
  } catch (err) {
    console.error('S3 presign error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
