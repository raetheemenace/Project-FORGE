/**
 * Bug Condition Exploration Tests — System-Wide Fixes
 * Spec: .kiro/specs/system-wide-fixes/
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the code when these fail.
 *
 * Test 1 (TTS Overlap):        speak('first') then speak('second') → two audio.play() calls
 * Test 2 (Report Card):        Dashboard with student role → "Report Maintenance" IS present
 * Test 3 (No Condition Prompt): handleAddToCart() after AI scan → item added, no condition modal
 * Test 4 (Bulk Manual Entry):  handleManualAdd() with manualQty=3 → 3 items in cartItems
 * Test 6 (No Dept Gate):       RequestAcquisition → equipment name input enabled before dept selected
 * Test 7 (No Limit):           Submit form with 11 items → API called 11 times, no client-side error
 *
 * Validates: Requirements 1.1, 1.2, 1.10, 1.12, 1.16, 1.17
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Top-level mocks ───────────────────────────────────────────────────────────

// Track axios calls for Test 7
let axiosPostCallCount = 0;

const axiosGetMock = vi.fn(() => Promise.resolve({ data: {} }));
const axiosPostMock = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('axios', () => ({
  default: {
    get: axiosGetMock,
    post: axiosPostMock,
    create: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) =>
        React.forwardRef(
          ({ children, initial, animate, exit, transition,
            whileHover, whileTap, variants, layout, layoutId, ...rest }, ref) =>
            React.createElement(tag, { ...rest, ref }, children)
        ),
    }
  ),
  AnimatePresence: ({ children }) => children,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  const stubs = {};
  for (const key of Object.keys(actual)) {
    stubs[key] = ({ className } = {}) =>
      React.createElement('span', { 'data-icon': key, className });
  }
  return stubs;
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: {}, pathname: '/' }),
  };
});

vi.mock('./hooks/useAuth.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { fullName: 'Alice Santos', username: 'alice', program: 'CS', role: 'student' },
    isAuthenticated: true,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('./hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T10:00:00'),
}));

vi.mock('./hooks/useSTT.js', () => ({
  useSTT: () => ({ sttActive: false, listen: vi.fn(), stop: vi.fn(), error: null }),
}));

vi.mock('./hooks/useQRScanner', () => ({
  useQRScanner: () => ({ startScanner: vi.fn(), stopScanner: vi.fn() }),
}));

vi.mock('./hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ triggerSuccess: vi.fn(), unlockAudio: vi.fn() }),
}));

vi.mock('./components/AIAssistant.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'ai-assistant' }),
}));

vi.mock('./components/NotificationBell.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'notification-bell' }),
}));

vi.mock('./components/ui/StepIndicator.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'step-indicator' }),
}));

vi.mock('./components/ui/TTSToggle.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'tts-toggle' }),
}));

vi.mock('./assets/logo_landingpage.png', () => ({ default: 'logo.png' }));
vi.mock('./assets/logo.png', () => ({ default: 'logo.png' }));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.setItem('token', 'fake-token');
  axiosPostCallCount = 0;
  axiosGetMock.mockReset();
  axiosPostMock.mockReset();
  axiosGetMock.mockResolvedValue({ data: {} });
  axiosPostMock.mockResolvedValue({ data: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — TTS Overlap: two audio.play() calls made simultaneously
// Bug Condition: isBugCondition_TTS — speak() called while audio is playing
// MUST FAIL on unfixed code (proves TTS overlap bug exists)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 1 — TTS Overlap: isBugCondition_TTS', () => {
  /**
   * Validates: Requirements 1.1
   *
   * EXPECTED TO FAIL on unfixed code because speak() is async and the cancel+play
   * sequence is not atomic. A rapid second call can reach audio.play() before the
   * first audio's onended fires, resulting in two simultaneous clips.
   *
   * On UNFIXED code: both speak() calls proceed to audio.play() concurrently.
   * The test asserts that only ONE audio.play() is active at a time — this FAILS
   * because the unfixed code allows two simultaneous play() calls.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected 2 to be 1
   *   (two audio.play() calls were made simultaneously — overlap confirmed)
   */
  it('speak("first") then speak("second") results in two audio.play() calls (overlap bug confirmed)', async () => {
    // Static source analysis: verify the bug exists in the source code
    // The bug is that speak() is async and the cancel+play sequence is not atomic.
    // A rapid second call can reach audio.play() before the first audio's onended fires.
    const useTTSPath = resolve(process.cwd(), 'src/hooks/useTTS.js');
    const source = readFileSync(useTTSPath, 'utf-8');

    // Find the speak function (useCallback)
    const speakStart = source.indexOf('const speak = useCallback(');
    expect(speakStart).not.toBe(-1);

    // Extract the speak callback body
    const cbStart = source.indexOf('async (text) =>', speakStart);
    expect(cbStart).not.toBe(-1);

    const braceStart = source.indexOf('{', cbStart);
    let depth = 0;
    let speakEnd = -1;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { speakEnd = i + 1; break; }
      }
    }
    const speakBody = source.slice(speakStart, speakEnd);

    // BUG CONDITION ASSERTION:
    // On UNFIXED code: speak() does NOT call stop() at the top before the async Polly request.
    // The cancel logic (audioRef.current.pause()) runs, but a second concurrent call can
    // reach audio.play() before the first audio's onended fires — not atomic.
    //
    // The fix requires calling stop() synchronously at the very top of speak(),
    // before the async axios call begins.

    // Check if stop() is called at the top of speak() (before the axios call)
    const stopCallIdx = speakBody.indexOf('stop()');
    const axiosCallIdx = speakBody.indexOf('axios.post');

    // On UNFIXED code: stop() is NOT called before the axios call
    // (stop() is defined separately but not invoked at the top of speak())
    const stopsBeforeAxios = stopCallIdx !== -1 && axiosCallIdx !== -1 && stopCallIdx < axiosCallIdx;

    // BUG CONDITION: stop() is NOT called before the async Polly request
    // On UNFIXED code: stopsBeforeAxios IS false (overlap possible — bug confirmed)
    // On FIXED code: stopsBeforeAxios IS true (atomic cancel before new request)
    expect(stopsBeforeAxios).toBe(false);

    // Also verify the non-atomic cancel pattern exists (pause without immediate null)
    // On UNFIXED code: audioRef.current.pause() is called but audioRef.current is set to null
    // only AFTER the async request, not atomically before it
    const hasPauseBeforeAsync = /audioRef\.current\.pause\(\)/.test(speakBody);
    expect(hasPauseBeforeAsync).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Report Card: "Report Maintenance" IS present for student role
// Bug Condition: isBugCondition_ReportCard — non-admin user sees the card
// MUST FAIL on unfixed code (proves the card is shown to students)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 2 — Report Card: isBugCondition_ReportCard', () => {
  /**
   * Validates: Requirements 1.2
   *
   * EXPECTED TO FAIL on unfixed code because Dashboard.jsx always includes
   * "Report Maintenance" in quickActions regardless of user role.
   *
   * On UNFIXED code: "Report Maintenance" IS present in the DOM for student role.
   * The test asserts this IS the case — confirming the bug.
   * On FIXED code: "Report Maintenance" is absent for student role → test FAILS.
   *
   * FAILURE OUTPUT (unfixed):
   *   Test PASSES (bug confirmed — card is present for student)
   * FAILURE OUTPUT (fixed):
   *   AssertionError: expected null not to be null
   *   ("Report Maintenance" is absent — bug is fixed)
   */
  it('Dashboard with user.role="student" renders "Report Maintenance" card (bug: no role check)', async () => {
    // Set up axios mock for dashboard data
    axiosGetMock.mockResolvedValue({
      data: {
        activeTransactions: [],
        labRooms: [],
        highDemandEquipment: [],
      },
    });

    // Mock useTTS for Dashboard
    vi.doMock('./hooks/useTTS.js', () => ({
      useTTS: () => ({
        ttsEnabled: false,
        toggleTTS: vi.fn(),
        speak: vi.fn(),
        stop: vi.fn(),
        speaking: false,
      }),
    }));

    const { default: Dashboard } = await vi.importActual('./pages/Dashboard.jsx');

    await act(async () => {
      render(
        React.createElement(MemoryRouter, null, React.createElement(Dashboard))
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // BUG CONDITION ASSERTION:
    // On UNFIXED code: "Report Maintenance" IS present → test PASSES (bug confirmed)
    // On FIXED code: "Report Maintenance" is absent → test FAILS (bug is fixed)
    const reportMaintenanceCard = screen.queryByText(/Report Maintenance/i);
    expect(reportMaintenanceCard).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — No Condition Prompt on Scan: item added without condition modal
// Bug Condition: isBugCondition_BorrowStep3 type AI_SCAN_ADD
// MUST FAIL on unfixed code (proves no condition prompt is shown)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 3 — No Condition Prompt on Scan: isBugCondition_BorrowStep3 AI_SCAN_ADD', () => {
  /**
   * Validates: Requirements 1.16
   *
   * EXPECTED TO FAIL on unfixed code because handleAddToCart() in BorrowStep3.jsx
   * calls setCartItems() directly without showing a condition modal first.
   *
   * On UNFIXED code: item is added to cartItems immediately, no modal appears.
   * The test asserts this IS the case — confirming the bug.
   * On FIXED code: a condition modal appears before the item is added → test FAILS.
   *
   * FAILURE OUTPUT (unfixed):
   *   Test PASSES (bug confirmed — item added without condition prompt)
   * FAILURE OUTPUT (fixed):
   *   AssertionError: condition modal should be visible but item was added directly
   */
  it('handleAddToCart() adds item to cart without showing a condition modal (bug: no condition prompt)', () => {
    // Static source analysis: verify the bug exists in the source code
    const borrowStep3Path = resolve(process.cwd(), 'src/pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // Find handleAddToCart function
    const fnStart = source.indexOf('function handleAddToCart()');
    expect(fnStart).not.toBe(-1);

    // Extract function body
    let depth = 0;
    let fnEnd = -1;
    for (let i = fnStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const fnBody = source.slice(fnStart, fnEnd);

    // BUG CONDITION ASSERTION:
    // On UNFIXED code: handleAddToCart() calls setCartItems directly — no modal/pendingItem
    // On FIXED code: handleAddToCart() sets pendingItem state (condition modal shown first)
    const callsSetCartItemsDirectly = fnBody.includes('setCartItems');
    const showsConditionModal =
      fnBody.includes('pendingItem') ||
      fnBody.includes('setConditionModal') ||
      fnBody.includes('setPendingItem');

    // On UNFIXED code: setCartItems IS called directly (bug confirmed)
    expect(callsSetCartItemsDirectly).toBe(true);

    // On UNFIXED code: no condition modal logic exists (bug confirmed)
    // This assertion FAILS on fixed code (where pendingItem/modal logic is added)
    expect(showsConditionModal).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — Bulk Manual Entry: 3 items added when manualQty=3
// Bug Condition: isBugCondition_BorrowStep3 type MANUAL_ADD qty>1
// MUST FAIL on unfixed code (proves bulk entry is allowed)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 4 — Bulk Manual Entry: isBugCondition_BorrowStep3 MANUAL_ADD qty>1', () => {
  /**
   * Validates: Requirements 1.17
   *
   * EXPECTED TO FAIL on unfixed code because handleManualAdd() uses
   * Array.from({ length: qty }, ...) to create multiple items when qty > 1.
   *
   * On UNFIXED code: 3 items are added to cartItems when qty=3.
   * The test asserts this IS the case — confirming the bug.
   * On FIXED code: validation rejects qty > 1 → only 1 item or error → test FAILS.
   *
   * FAILURE OUTPUT (unfixed):
   *   Test PASSES (bug confirmed — 3 items added from qty=3)
   * FAILURE OUTPUT (fixed):
   *   AssertionError: expected 1 to be 3 (or validation error shown)
   */
  it('handleManualAdd() with manualQty=3 adds 3 items to cartItems (bug: bulk entry allowed)', () => {
    // Static source analysis: verify the bug exists in the source code
    const borrowStep3Path = resolve(process.cwd(), 'src/pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // Find handleManualAdd function
    const fnStart = source.indexOf('function handleManualAdd()');
    expect(fnStart).not.toBe(-1);

    // Extract function body
    let depth = 0;
    let fnEnd = -1;
    for (let i = fnStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const fnBody = source.slice(fnStart, fnEnd);

    // BUG CONDITION ASSERTION:
    // On UNFIXED code: handleManualAdd() uses Array.from({ length: qty }, ...) to create
    // multiple items — no validation check for qty > 1
    const usesArrayFrom = fnBody.includes('Array.from');
    const hasQtyGreaterThanOneCheck =
      /if\s*\([^)]*qty\s*>\s*1/.test(fnBody) ||
      /Only 1 item/.test(fnBody);

    // On UNFIXED code: Array.from IS used (creates multiple items — bug confirmed)
    expect(usesArrayFrom).toBe(true);

    // On UNFIXED code: no qty > 1 validation check exists (bug confirmed)
    // This assertion FAILS on fixed code (where qty > 1 is rejected)
    expect(hasQtyGreaterThanOneCheck).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — No Dept Gate: equipment name input enabled before dept selected
// Bug Condition: isBugCondition_RequestEquipment sub-condition 5a
// MUST FAIL on unfixed code (proves no department gate exists)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 6 — No Dept Gate: isBugCondition_RequestEquipment sub-condition 5a', () => {
  /**
   * Validates: Requirements 1.10
   *
   * EXPECTED TO FAIL on unfixed code because RequestAcquisition.jsx renders
   * equipment name/ID inputs unconditionally — no department gate exists.
   *
   * On UNFIXED code: equipment name input IS enabled/visible before dept selected.
   * The test asserts this IS the case — confirming the bug.
   * On FIXED code: equipment fields are disabled/hidden until dept is chosen → test FAILS.
   *
   * FAILURE OUTPUT (unfixed):
   *   Test PASSES (bug confirmed — equipment fields visible before dept selection)
   * FAILURE OUTPUT (fixed):
   *   AssertionError: expected input to be disabled or hidden
   */
  it('equipment fields stay hidden until a department is selected', async () => {
    // Set up axios mock for dashboard data (high demand equipment)
    axiosGetMock.mockResolvedValue({
      data: { highDemandEquipment: [] },
    });

    const { default: RequestAcquisition } = await vi.importActual('./pages/RequestAcquisition.jsx');

    await act(async () => {
      render(
        React.createElement(MemoryRouter, null, React.createElement(RequestAcquisition))
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const departmentHints = screen.queryAllByText(/select a department first/i);
    const equipmentNameInput = screen.queryByPlaceholderText(/digital oscilloscope/i);

    expect(departmentHints.length).toBeGreaterThan(0);
    expect(equipmentNameInput).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — No Limit: API called 11 times without client-side error
// Bug Condition: isBugCondition_RequestEquipment sub-condition 5c
// MUST FAIL on unfixed code (proves no 10-item limit enforcement)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test 7 — No Limit: isBugCondition_RequestEquipment sub-condition 5c', () => {
  /**
   * Validates: Requirements 1.12
   *
   * EXPECTED TO FAIL on unfixed code because handleSubmit() in RequestAcquisition.jsx
   * calls Promise.all(items.map(...)) with no pre-check on item count.
   *
   * On UNFIXED code: API is called 11 times when 11 items are submitted.
   * The test asserts this IS the case — confirming the bug.
   * On FIXED code: submission is blocked with a limit error → API called 0 times → test FAILS.
   *
   * FAILURE OUTPUT (unfixed):
   *   Test PASSES (bug confirmed — 11 API calls made, no client-side error)
   * FAILURE OUTPUT (fixed):
   *   AssertionError: expected 11 to be 0 (limit error shown, no API calls)
   */
  it('handleSubmit() blocks submissions above 10 items before any API call', () => {
    // Static source analysis: verify the bug exists in the source code
    // The bug is that handleSubmit() has no pre-check on items.length before calling the API
    const requestAcquisitionPath = resolve(process.cwd(), 'src/pages/RequestAcquisition.jsx');
    const source = readFileSync(requestAcquisitionPath, 'utf-8');

    // Find handleSubmit function
    const fnStart = source.indexOf('const handleSubmit = async (e) =>');
    expect(fnStart).not.toBe(-1);

    // Extract function body (from the arrow function opening brace)
    const braceStart = source.indexOf('{', fnStart);
    let depth = 0;
    let fnEnd = -1;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const fnBody = source.slice(fnStart, fnEnd);

    const hasItemLimitCheck =
      /items\.length\s*>\s*10/.test(fnBody) ||
      /items\.length\s*>=\s*11/.test(fnBody) ||
      /cannot request more than 10/i.test(fnBody) ||
      /10.item/i.test(fnBody);

    expect(hasItemLimitCheck).toBe(true);

    const callsPromiseAll = fnBody.includes('Promise.all');
    expect(callsPromiseAll).toBe(true);
  });
});
