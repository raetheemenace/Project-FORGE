// Admin Equipment CRUD Routes
// GET/POST/PUT/DELETE /api/admin/equipment
// Requires LAB_ADMIN role (Requirements: 15.2, 15.9)

const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const s3 = new S3Client({ region: process.env.AWS_REGION });

// ---------------------------------------------------------------------------
// Equipment ID generator — EQ-XXXX (4-digit random number)
// ---------------------------------------------------------------------------

/**
 * Generate a candidate Equipment ID in the format EQ-XXXX.
 * @returns {string}
 */
function generateEquipmentId() {
  const num = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  return `EQ-${num}`;
}

/**
 * Generate a unique Equipment ID that does not already exist in the DB.
 * Retries up to 20 times before throwing.
 * @param {object} dbClient - pg pool or client with .query()
 * @returns {Promise<string>}
 */
async function getUniqueEquipmentId(dbClient) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateEquipmentId();
    const result = await dbClient.query(
      'SELECT 1 FROM forge_equipment WHERE equipment_id = $1',
      [candidate]
    );
    if (result.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate a unique Equipment ID after 20 attempts.');
}

// ---------------------------------------------------------------------------
// Helper: log admin action
// ---------------------------------------------------------------------------

async function logAdminAction(dbClient, adminId, actionType, targetId, details) {
  await dbClient.query(
    `INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, 'EQUIPMENT', $3, $4)`,
    [adminId, actionType, targetId, JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/equipment — list all equipment
// ---------------------------------------------------------------------------

router.get('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT equipment_id, name, department, s3_image_key, status
       FROM forge_equipment
       ORDER BY equipment_id ASC`
    );
    return res.json({ equipment: result.rows });
  } catch (err) {
    console.error('Admin list equipment error:', err);
    return res.status(500).json({ error: 'Failed to fetch equipment list.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/equipment — create new equipment
// Body: { name, department, status?, imageBase64?, imageFilename? }
// ---------------------------------------------------------------------------

router.post('/', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { name, department, status, imageBase64, imageFilename } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Equipment name is required.' });
  }
  if (!department || !department.trim()) {
    return res.status(400).json({ error: 'Department is required.' });
  }

  const adminId = req.user.userId;
  const equipmentStatus = status || 'AVAILABLE';

  let s3ImageKey = null;

  // Upload image to S3 if provided
  if (imageBase64 && imageFilename) {
    try {
      // Generate a temporary ID for the S3 key path (will be replaced with real ID below)
      const tempId = generateEquipmentId();
      const key = `equipment/${tempId}/${imageFilename}`;
      const buffer = Buffer.from(imageBase64, 'base64');
      const ext = imageFilename.split('.').pop().toLowerCase();
      const contentTypeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));

      s3ImageKey = key;
    } catch (s3Err) {
      console.error('S3 upload error:', s3Err);
      return res.status(500).json({ error: 'Failed to upload equipment image.' });
    }
  }

  try {
    const equipmentId = await getUniqueEquipmentId(db);

    // If we uploaded to S3 with a temp path, update the key to use the real ID
    if (s3ImageKey && imageFilename) {
      const realKey = `equipment/${equipmentId}/${imageFilename}`;
      // Re-upload with correct key (copy is simpler but requires extra SDK; just re-upload)
      try {
        const buffer = Buffer.from(imageBase64, 'base64');
        const ext = imageFilename.split('.').pop().toLowerCase();
        const contentTypeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: realKey,
          Body: buffer,
          ContentType: contentType,
        }));
        s3ImageKey = realKey;
      } catch (s3Err) {
        console.error('S3 re-upload error:', s3Err);
        // Non-fatal: keep the temp key
      }
    }

    await db.query(
      `INSERT INTO forge_equipment (equipment_id, name, department, s3_image_key, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [equipmentId, name.trim(), department.trim(), s3ImageKey, equipmentStatus]
    );

    await logAdminAction(db, adminId, 'EQUIPMENT_CREATED', equipmentId, {
      name: name.trim(),
      department: department.trim(),
      status: equipmentStatus,
    });

    return res.status(201).json({
      equipmentId,
      message: 'Equipment created successfully.',
    });
  } catch (err) {
    console.error('Admin create equipment error:', err);
    return res.status(500).json({ error: 'Failed to create equipment.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/equipment/:id — update equipment
// Body: { name?, department?, status?, imageBase64?, imageFilename? }
// ---------------------------------------------------------------------------

router.put('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, department, status, imageBase64, imageFilename } = req.body;
  const adminId = req.user.userId;

  try {
    // Check equipment exists
    const existing = await db.query(
      'SELECT * FROM forge_equipment WHERE equipment_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const current = existing.rows[0];
    const updatedName = name ? name.trim() : current.name;
    const updatedDept = department ? department.trim() : current.department;
    const updatedStatus = status || current.status;
    let updatedS3Key = current.s3_image_key;

    // Upload new image if provided
    if (imageBase64 && imageFilename) {
      try {
        const key = `equipment/${id}/${imageFilename}`;
        const buffer = Buffer.from(imageBase64, 'base64');
        const ext = imageFilename.split('.').pop().toLowerCase();
        const contentTypeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));
        updatedS3Key = key;
      } catch (s3Err) {
        console.error('S3 upload error on update:', s3Err);
        return res.status(500).json({ error: 'Failed to upload equipment image.' });
      }
    }

    await db.query(
      `UPDATE forge_equipment
       SET name = $1, department = $2, status = $3, s3_image_key = $4
       WHERE equipment_id = $5`,
      [updatedName, updatedDept, updatedStatus, updatedS3Key, id]
    );

    await logAdminAction(db, adminId, 'EQUIPMENT_UPDATED', id, {
      name: updatedName,
      department: updatedDept,
      status: updatedStatus,
    });

    return res.json({ message: 'Equipment updated successfully.' });
  } catch (err) {
    console.error('Admin update equipment error:', err);
    return res.status(500).json({ error: 'Failed to update equipment.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/equipment/:id — mark as DISPOSED
// ---------------------------------------------------------------------------

router.delete('/:id', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.userId;

  try {
    const existing = await db.query(
      'SELECT equipment_id FROM forge_equipment WHERE equipment_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    await db.query(
      `UPDATE forge_equipment SET status = 'DISPOSED' WHERE equipment_id = $1`,
      [id]
    );

    await logAdminAction(db, adminId, 'EQUIPMENT_DISPOSED', id, { equipmentId: id });

    return res.json({ message: 'Equipment marked as disposed.' });
  } catch (err) {
    console.error('Admin dispose equipment error:', err);
    return res.status(500).json({ error: 'Failed to dispose equipment.' });
  }
});

module.exports = router;
module.exports.generateEquipmentId = generateEquipmentId;
module.exports.getUniqueEquipmentId = getUniqueEquipmentId;
