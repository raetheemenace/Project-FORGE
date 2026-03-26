import { useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * Custom hook for QR code scanning using html5-qrcode library
 * Handles camera lifecycle, QR decode success/error callbacks
 * Requirements: 10.2, 10.7
 */
export function useQRScanner(onScanSuccess, onScanError) {
  const scannerRef = useRef(null);
  
  /**
   * Start the QR scanner on a given HTML element
   * @param {string} elementId - The ID of the HTML element to render the scanner in
   */
  const startScanner = useCallback((elementId) => {
    // Clean up any existing scanner
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => {
        console.warn('Error clearing previous scanner:', err);
      });
    }

    const scanner = new Html5QrcodeScanner(elementId, {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      // Let the library handle aspect ratio automatically for better compatibility
      // Removed explicit aspectRatio to avoid issues on different screen sizes
      facingMode: 'environment', // Use back camera on mobile
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
    });
    
    scanner.render(
      (decodedText) => {
        try {
          // Try to parse as JSON (FORGE QR codes contain JSON)
          const data = JSON.parse(decodedText);
          if (data.type === 'FORGE_EQUIPMENT' && data.equipmentId) {
            onScanSuccess(data.equipmentId);
          } else {
            onScanError('Invalid QR code format: Missing equipment information');
          }
        } catch (err) {
          // If not JSON, treat as plain text equipment ID
          // This allows for simple QR codes that just contain the ID
          if (decodedText && decodedText.trim()) {
            onScanSuccess(decodedText.trim());
          } else {
            onScanError('Invalid QR code format: Unable to extract equipment ID');
          }
        }
      },
      (error) => {
        // This callback fires frequently during scanning, so we don't treat it as an error
        // Only log actual errors, not "No QR code found" messages
        if (error && !error.includes('NotFoundException')) {
          console.debug('QR scan error:', error);
        }
      }
    );
    
    scannerRef.current = scanner;
  }, [onScanSuccess, onScanError]);
  
  /**
   * Stop the QR scanner and clean up resources
   */
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear()
        .then(() => {
          scannerRef.current = null;
        })
        .catch(err => {
          console.error('Error stopping scanner:', err);
          scannerRef.current = null;
        });
    }
  }, []);
  
  return { startScanner, stopScanner };
}
