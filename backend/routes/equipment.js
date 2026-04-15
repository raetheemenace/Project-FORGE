// Equipment Routes — GET /api/equipment/image-url/:id
// Generates a pre-signed S3 URL for an equipment image (7-day expiry)
const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const SEVEN_DAYS_SECONDS = 604800;

/**
 * GET /api/equipment/image-url/:id
 * Returns a pre-signed S3 URL for the equipment image.
 * Expiry: 7 days (604800 seconds)
 */
router.get('/image-url/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT s3_image_key FROM forge_equipment WHERE equipment_id = $1',
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].s3_image_key) {
      return res.status(404).json({ error: 'No image found for this equipment.' });
    }

    const s3Key = result.rows[0].s3_image_key;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    const imageUrl = await getSignedUrl(s3, command, { expiresIn: SEVEN_DAYS_SECONDS });

    return res.json({ imageUrl });
  } catch (err) {
    console.error('Equipment image URL error:', err);
    return res.status(500).json({ error: 'Failed to generate image URL.' });
  }
});

/**
<<<<<<< HEAD
 * GET /api/equipment?department=X
 * Returns equipment rows, optionally filtered by department.
 * Includes totalUnits and availableUnits for stock tracking.
 */
router.get('/', authenticateToken, async (req, res) => {
  const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';

  try {
    const params = [];
    let query = `
      SELECT DISTINCT ON (equipment_id)
        equipment_id,
        name,
        department,
        status,
        (SELECT COUNT(*) FROM forge_equipment e2 WHERE e2.name = forge_equipment.name)::int AS "totalUnits",
        (SELECT COUNT(*) FROM forge_equipment e2 WHERE e2.name = forge_equipment.name AND e2.status = 'AVAILABLE')::int AS "availableUnits"
      FROM forge_equipment
    `;

    if (department) {
      params.push(department);
      query += ' WHERE department = $1';
    }

    query += ' ORDER BY equipment_id, name LIMIT 200';

    const result = await db.query(query, params);

    return res.json(
      result.rows.map((row) => ({
        equipmentId: row.equipment_id,
        name: row.name,
        department: row.department,
        status: row.status,
        totalUnits: row.totalUnits,
        availableUnits: row.availableUnits,
      }))
    );
  } catch (err) {
    console.error('Equipment list error:', err);
    return res.status(500).json({ error: 'Failed to fetch equipment list.' });
  }
});

/**
=======
>>>>>>> parent of 90c4320 (new)
 * GET /api/equipment/:id
 * Returns basic equipment details (name, status, department) by equipment_id.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT equipment_id, name, department, status FROM forge_equipment WHERE equipment_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }
    const row = result.rows[0];
    return res.json({
      equipmentId: row.equipment_id,
      name: row.name,
      department: row.department,
      status: row.status,
    });
  } catch (err) {
    console.error('Equipment lookup error:', err);
    return res.status(500).json({ error: 'Failed to fetch equipment.' });
  }
});

module.exports = router;
