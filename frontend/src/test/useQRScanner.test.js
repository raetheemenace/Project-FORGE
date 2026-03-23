/**
 * Tests for useQRScanner hook
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture render callbacks from the mock
let capturedSuccessCallback;
let capturedErrorCallback;
const mockClear = vi.fn(() => Promise.resolve());
const mockRender = vi.fn((onSuccess, onError) => {
  capturedSuccessCallback = onSuccess;
  capturedErrorCallback = onError;
});

// Use a class so `new Html5QrcodeScanner(...)` works
class MockHtml5QrcodeScanner {
  constructor(elementId, config) {
    // Record constructor args on the class itself for assertion
    MockHtml5QrcodeScanner.lastElementId = elementId;
    MockHtml5QrcodeScanner.lastConfig = config;
    MockHtml5QrcodeScanner.instanceCount = (MockHtml5QrcodeScanner.instanceCount || 0) + 1;
  }
  render(onSuccess, onError) {
    mockRender(onSuccess, onError);
  }
  clear() {
    return mockClear();
  }
}

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: MockHtml5QrcodeScanner,
}));

// Minimal React mock so the hook runs in Node environment
vi.mock('react', () => ({
  useRef: (initial) => ({ current: initial }),
  useCallback: (fn) => fn,
}));

const { useQRScanner } = await import('../hooks/useQRScanner.js');

describe('useQRScanner', () => {
  let onScanSuccess;
  let onScanError;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedSuccessCallback = undefined;
    capturedErrorCallback = undefined;
    MockHtml5QrcodeScanner.lastElementId = undefined;
    MockHtml5QrcodeScanner.lastConfig = undefined;
    MockHtml5QrcodeScanner.instanceCount = 0;
    onScanSuccess = vi.fn();
    onScanError = vi.fn();

    mockRender.mockImplementation((onSuccess, onError) => {
      capturedSuccessCallback = onSuccess;
      capturedErrorCallback = onError;
    });
  });

  // Test 1: Constructor called with correct config
  it('calls Html5QrcodeScanner constructor with fps:10, qrbox 250x250, facingMode environment', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    expect(MockHtml5QrcodeScanner.lastElementId).toBe('qr-reader');
    expect(MockHtml5QrcodeScanner.lastConfig).toMatchObject({
      fps: 10,
      qrbox: { width: 250, height: 250 },
      facingMode: 'environment',
    });
  });

  // Test 2: scanner.clear() called when stopScanner is invoked
  it('calls scanner.clear() when stopScanner is invoked', () => {
    const { startScanner, stopScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');
    stopScanner();

    expect(mockClear).toHaveBeenCalled();
  });

  // Test 3: FORGE_EQUIPMENT JSON with valid equipmentId → onScanSuccess with equipmentId
  it('calls onScanSuccess with equipmentId for valid FORGE_EQUIPMENT JSON', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    const payload = JSON.stringify({ type: 'FORGE_EQUIPMENT', equipmentId: 'EQ-001' });
    capturedSuccessCallback(payload);

    expect(onScanSuccess).toHaveBeenCalledWith('EQ-001');
    expect(onScanError).not.toHaveBeenCalled();
  });

  // Test 4: FORGE_EQUIPMENT JSON missing equipmentId → onScanError
  it('calls onScanError when FORGE_EQUIPMENT JSON is missing equipmentId', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    const payload = JSON.stringify({ type: 'FORGE_EQUIPMENT' });
    capturedSuccessCallback(payload);

    expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Missing equipment information');
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  // Test 5: FORGE_EQUIPMENT JSON missing type → onScanError
  it('calls onScanError when JSON is missing type field', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    const payload = JSON.stringify({ equipmentId: 'EQ-002' });
    capturedSuccessCallback(payload);

    expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Missing equipment information');
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  // Test 6: Plain non-JSON non-empty string → onScanSuccess with trimmed string
  it('calls onScanSuccess with trimmed string for plain non-JSON non-empty input', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    capturedSuccessCallback('  EQ-PLAIN-123  ');

    expect(onScanSuccess).toHaveBeenCalledWith('EQ-PLAIN-123');
    expect(onScanError).not.toHaveBeenCalled();
  });

  // Test 7: Empty string → onScanError
  it('calls onScanError for empty string input', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    capturedSuccessCallback('');

    expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Unable to extract equipment ID');
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  // Test 8: Whitespace-only string → onScanError
  it('calls onScanError for whitespace-only string input', () => {
    const { startScanner } = useQRScanner(onScanSuccess, onScanError);
    startScanner('qr-reader');

    capturedSuccessCallback('   ');

    expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Unable to extract equipment ID');
    expect(onScanSuccess).not.toHaveBeenCalled();
  });
});

// Feature: lab-system-full-integration, Property 10: QR FORGE_EQUIPMENT JSON triggers success callback
import fc from 'fast-check';

describe('Property 10: QR FORGE_EQUIPMENT JSON triggers success callback', () => {
  /**
   * Validates: Requirements 4.2
   */
  it('onScanSuccess is called with equipmentId from FORGE_EQUIPMENT JSON payload', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (equipmentId) => {
        const onScanSuccess = vi.fn();
        const onScanError = vi.fn();

        const { startScanner } = useQRScanner(onScanSuccess, onScanError);
        startScanner('qr-reader');

        const payload = JSON.stringify({ type: 'FORGE_EQUIPMENT', equipmentId });
        capturedSuccessCallback(payload);

        expect(onScanSuccess).toHaveBeenCalledWith(equipmentId);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 11: Non-JSON QR payload triggers success callback with trimmed text
describe('Property 11: Non-JSON QR payload triggers success callback with trimmed text', () => {
  /**
   * Validates: Requirements 4.3
   */
  it('onScanSuccess is called with trimmed text for non-JSON QR payload', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => {
          try { JSON.parse(s); return false; } catch { return true; }
        }).filter(s => s.trim().length > 0),
        (s) => {
          const onScanSuccess = vi.fn();
          const onScanError = vi.fn();

          const { startScanner } = useQRScanner(onScanSuccess, onScanError);
          startScanner('qr-reader');

          capturedSuccessCallback(s);

          expect(onScanSuccess).toHaveBeenCalledWith(s.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 12: Invalid JSON QR payload triggers error callback
describe('Property 12: Invalid JSON QR payload triggers error callback', () => {
  /**
   * Validates: Requirements 4.4
   */
  it('onScanError is called with "Invalid QR code format: Missing equipment information" for JSON missing type and equipmentId', () => {
    fc.assert(
      fc.property(fc.record({ someKey: fc.string() }), (obj) => {
        const onScanSuccess = vi.fn();
        const onScanError = vi.fn();

        const { startScanner } = useQRScanner(onScanSuccess, onScanError);
        startScanner('qr-reader');

        const payload = JSON.stringify(obj);
        capturedSuccessCallback(payload);

        expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Missing equipment information');
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 13: Whitespace QR payload triggers error callback
describe('Property 13: Whitespace QR payload triggers error callback', () => {
  /**
   * Validates: Requirements 4.5
   */
  it('onScanError is called with "Invalid QR code format: Unable to extract equipment ID" for whitespace-only QR payload', () => {
    fc.assert(
      fc.property(fc.string().map(s => s.replace(/\S/g, ' ')), (whitespaceStr) => {
        const onScanSuccess = vi.fn();
        const onScanError = vi.fn();

        const { startScanner } = useQRScanner(onScanSuccess, onScanError);
        startScanner('qr-reader');

        capturedSuccessCallback(whitespaceStr);

        expect(onScanError).toHaveBeenCalledWith('Invalid QR code format: Unable to extract equipment ID');
      }),
      { numRuns: 100 }
    );
  });
});
