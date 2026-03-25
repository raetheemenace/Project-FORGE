const QRCode = require('qrcode');

/**
 * Generate a QR code containing Equipment ID in JSON format, or as a URL.
 * @param {string} equipmentId - The equipment ID to encode
 * @param {object} [options]
 * @param {boolean} [options.asUrl=false] - When true, encode a URL payload instead of JSON
 * @returns {Promise<string>} QR code as PNG data URL
 */
async function generateQRCode(equipmentId, { asUrl = false } = {}) {
  if (!equipmentId) {
    throw new Error('Equipment ID is required');
  }

  // Build the payload
  let qrData;
  if (asUrl) {
    const domain = process.env.APP_DOMAIN || 'localhost:5173';
    qrData = `https://${domain}/equipment/${equipmentId}`;
  } else {
    // Default: JSON payload (existing behaviour — do not change)
    qrData = JSON.stringify({
      type: 'FORGE_EQUIPMENT',
      equipmentId: equipmentId,
      timestamp: new Date().toISOString()
    });
  }

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
