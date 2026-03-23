// Feature: forge-system, Property 17: QR code decode round trip
// Validates: Requirements 10.2, 10.7, 15.11

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateQRCode } from './qrGenerator.js';
import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';

/**
 * Decode a QR code from a data URL
 * @param {string} dataUrl - Base64 encoded PNG data URL
 * @returns {Promise<string|null>} - Decoded QR code content or null if failed
 */
async function decodeQRCode(dataUrl) {
  try {
    // Load the image from data URL
    const img = await loadImage(dataUrl);
    
    // Create a canvas and draw the image
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    return code ? code.data : null;
  } catch (error) {
    console.error('QR decode error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Property 17: QR code decode round trip
// Validates: Requirements 10.2, 10.7, 15.11
// ---------------------------------------------------------------------------

describe('Property 17: QR code decode round trip', () => {
  
  it('generating a QR code and then decoding it returns the same Equipment ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary equipment IDs in the format EQ-XXXX
        fc.integer({ min: 1000, max: 9999 }).map(num => `EQ-${num}`),
        async (equipmentId) => {
          // Generate QR code
          const qrCodeDataUrl = await generateQRCode(equipmentId);
          
          // Decode the QR code
          const decodedData = await decodeQRCode(qrCodeDataUrl);
          
          // The decoded data should be a JSON string
          expect(decodedData).toBeTruthy();
          
          // Parse the JSON
          const parsedData = JSON.parse(decodedData);
          
          // Verify the structure
          expect(parsedData).toHaveProperty('type');
          expect(parsedData).toHaveProperty('equipmentId');
          expect(parsedData).toHaveProperty('timestamp');
          
          // Verify the type
          expect(parsedData.type).toBe('FORGE_EQUIPMENT');
          
          // The decoded Equipment ID should match the original
          expect(parsedData.equipmentId).toBe(equipmentId);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('round trip preserves Equipment ID for edge case IDs', async () => {
    const edgeCaseIds = [
      'EQ-0001',
      'EQ-9999',
      'EQ-1234',
      'EQ-5678',
    ];

    for (const equipmentId of edgeCaseIds) {
      const qrCodeDataUrl = await generateQRCode(equipmentId);
      const decodedData = await decodeQRCode(qrCodeDataUrl);
      const parsedData = JSON.parse(decodedData);
      
      expect(parsedData.equipmentId).toBe(equipmentId);
    }
  });

  it('decoded QR code contains valid timestamp', async () => {
    const equipmentId = 'EQ-7167';
    const qrCodeDataUrl = await generateQRCode(equipmentId);
    const decodedData = await decodeQRCode(qrCodeDataUrl);
    const parsedData = JSON.parse(decodedData);
    
    // Verify timestamp is a valid ISO string
    expect(parsedData.timestamp).toBeTruthy();
    const timestamp = new Date(parsedData.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
    
    // Timestamp should be recent (within last minute)
    const now = new Date();
    const diff = now - timestamp;
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(60000); // Less than 1 minute
  });
});
