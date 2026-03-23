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
 * Requirements: 13.1, 13.2, 13.3
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
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });

    const imageUrl = await getSignedUrl(s3, command, { expiresIn: SEVEN_DAYS_SECONDS });

    return res.json({ imageUrl });
  } catch (err) {
    console.error('Equipment image URL error:', err);
    return res.status(500).json({ error: 'Failed to generate image URL.' });
  }
});

module.exports = router;
