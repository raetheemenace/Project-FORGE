const QRCode = require('qrcode');

/**
 * Generate a QR code containing Equipment ID in JSON format
 * @param {string} equipmentId - The equipment ID to encode
 * @returns {Promise<string>} QR code as PNG data URL
 */
async function generateQRCode(equipmentId) {
  if (!equipmentId) {
    throw new Error('Equipment ID is required');
  }

  // Create JSON payload with equipment information
  const qrData = JSON.stringify({
    type: 'FORGE_EQUIPMENT',
    equipmentId: equipmentId,
    timestamp: new Date().toISOString()
  });

  try {
    // Generate QR code with high error correction and 300x300px size
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',  // High error correction (30% recovery)
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#001254',  // FORGE brand color
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (err) {
    throw new Error(`Failed to generate QR code: ${err.message}`);
  }
}

module.exports = { generateQRCode };
