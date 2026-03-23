// Admin QR Code Generation Route
// GET /api/admin/qrcode/:equipmentId
// Requires LAB_ADMIN role (Requirements: 15.11, 15.10)

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { generateQRCode } = require('../../utils/qrGenerator');

/**
 * GET /api/admin/qrcode/:equipmentId
 * Generate QR code for equipment
 * Returns QR code as PNG data URL
 */
router.get('/:equipmentId', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { equipmentId } = req.params;

  try {
    // Verify equipment exists
    const equipmentResult = await db.query(
      'SELECT equipment_id, name FROM forge_equipment WHERE equipment_id = $1',
      [equipmentId]
    );

    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Equipment not found' 
      });
    }

    // Generate QR code
    const qrCodeDataURL = await generateQRCode(equipmentId);

    // Return QR code data URL
    res.json({
      equipmentId: equipmentId,
      equipmentName: equipmentResult.rows[0].name,
      qrCode: qrCodeDataURL
    });

  } catch (err) {
    console.error('QR code generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: err.message 
    });
  }
});

module.exports = router;
