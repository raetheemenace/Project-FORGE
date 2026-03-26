import { useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * Custom hook for QR code scanning using html5-qrcode library.
 * Callbacks are captured via refs so startScanner/stopScanner identities
 * never change across re-renders (no stale-closure risk).
 */
export function useQRScanner(onScanSuccess, onScanError) {
  const scannerRef = useRef(null);

  // Keep latest callbacks in refs — avoids needing them as useCallback deps
  const onSuccessRef = useRef(onScanSuccess);
  const onErrorRef = useRef(onScanError);
  onSuccessRef.current = onScanSuccess;
  onErrorRef.current = onScanError;

  const stopScanner = useCallback(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null; // clear ref immediately to prevent double-stop
    scanner.clear().catch((err) => {
      // html5-qrcode throws if clear() is called before render() completes;
      // safe to ignore — the scanner is already being torn down.
      console.warn('QR scanner clear warning (safe to ignore):', err?.message ?? err);
    });
  }, []);

  const startScanner = useCallback((elementId) => {
    // Tear down any existing instance first
    const existing = scannerRef.current;
    if (existing) {
      scannerRef.current = null;
      existing.clear().catch(() => {});
    }

    const scanner = new Html5QrcodeScanner(
      elementId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        facingMode: 'environment',
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Use ref so we always call the latest callback
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'FORGE_EQUIPMENT' && data.equipmentId) {
            onSuccessRef.current(data.equipmentId);
          } else {
            onErrorRef.current('Invalid QR code format: Missing equipment information');
          }
        } catch {
          // Plain-text QR (just the equipment ID)
          const trimmed = decodedText?.trim();
          if (trimmed) {
            onSuccessRef.current(trimmed);
          } else {
            onErrorRef.current('Invalid QR code format: Unable to extract equipment ID');
          }
        }
      },
      (errorMsg) => {
        // This fires on every frame where no QR is found — not a real error.
        // Only surface genuine errors (not NotFoundException / No MultiFormat).
        if (
          errorMsg &&
          !errorMsg.includes('NotFoundException') &&
          !errorMsg.includes('No MultiFormat')
        ) {
          console.debug('QR frame error:', errorMsg);
        }
      }
    );

    scannerRef.current = scanner;
  }, []); // stable — no external deps needed thanks to refs

  return { startScanner, stopScanner };
}
