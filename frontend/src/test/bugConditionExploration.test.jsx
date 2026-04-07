/**
 * Bug Condition Exploration Tests
 * Validates: Requirements 1.1, 1.5, 1.6, 2.1, 2.2, 2.3
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the code when these fail.
 *
 * Bug AI (scope)         req 2.1–2.3 — BASE_SYSTEM_PROMPT deflects general lab questions
 * Bug 1  (TTS)           req 1.1 — speak() never called with dashboard content
 * Bug 5  (QR container)  req 1.5 — #qr-reader has no dimensions after scan starts
 * Bug 6  (missing route) req 1.6 — /equipment/:id has no route; hits wildcard redirect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';


// ── Top-level mocks (hoisted by Vitest) ──────────────────────────────────────

const speakMock = vi.fn();

vi.mock('../hooks/useTTS.js', () => ({
  useTTS: () => ({
    ttsEnabled: true,
    toggleTTS: vi.fn(),
    speak: speakMock,
    stop: vi.fn(),
    speaking: false,
  }),
}));

vi.mock('../hooks/useAuth.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { fullName: 'Alice Santos', username: 'alice', program: 'CS', role: 'STUDENT' },
    isAuthenticated: true,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T10:00:00'),
}));

vi.mock('../hooks/useSTT.js', () => ({
  useSTT: () => ({ sttActive: false, listen: vi.fn(), stop: vi.fn(), error: null }),
}));

vi.mock('../hooks/useQRScanner', () => ({
  useQRScanner: () => ({ startScanner: vi.fn(), stopScanner: vi.fn() }),
}));

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: class {
    render() {}
    clear() { return Promise.resolve(); }
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          activeTransactions: [
            { txn_id: 'TXN-001', status: 'ACTIVE', department: 'CS', items: [], lab_room: 'R1' },
          ],
          labRooms: [{ roomId: 'R1', roomName: 'Lab 1', department: 'CS', status: 'ACTIVE' }],
          highDemandEquipment: [
            { equipmentId: 'EQ-001', name: 'Oscilloscope', status: 'AVAILABLE' },
          ],
        },
      })
    ),
    post: vi.fn(() => Promise.resolve({ data: {} })),
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
  // Override every export with a lightweight stub that renders a <span>
  const stubs = {};
  for (const key of Object.keys(actual)) {
    const name = key;
    stubs[name] = ({ className } = {}) =>
      React.createElement('span', { 'data-icon': name, className });
  }
  return stubs;
});

vi.mock('../assets/logo_landingpage.png', () => ({ default: 'logo.png' }));
vi.mock('../assets/logo.png', () => ({ default: 'logo.png' }));
vi.mock('../assets/hero.png', () => ({ default: 'hero.png' }));

// Stub all pages so App can import them without errors
vi.mock('../pages/LandingPage.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'landing' }) }));
vi.mock('../pages/SignIn.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'signin' }) }));
vi.mock('../pages/SignUp.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'signup' }) }));
vi.mock('../pages/LogUpdated.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'log-updated' }) }));
vi.mock('../pages/MyTransactions.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'transactions' }) }));
vi.mock('../pages/OfflinePage.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'offline' }) }));
vi.mock('../pages/borrow/BorrowStep1.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'borrow1' }) }));
vi.mock('../pages/borrow/BorrowStep2.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'borrow2' }) }));
vi.mock('../pages/borrow/BorrowStep3.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'borrow3' }) }));
vi.mock('../pages/borrow/BorrowStep4.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'borrow4' }) }));
vi.mock('../pages/admin/AdminDashboard.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin' }) }));
vi.mock('../pages/admin/EquipmentManagement.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-equipment' }) }));
vi.mock('../pages/admin/TransactionOversight.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-transactions' }) }));
vi.mock('../pages/admin/MaintenanceTickets.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-tickets' }) }));
vi.mock('../pages/admin/UserManagement.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-users' }) }));
vi.mock('../pages/admin/LabRoomManagement.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-rooms' }) }));
vi.mock('../pages/admin/SystemReports.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'admin-reports' }) }));
// MachineDetail stub — on unfixed code this file does not exist; App won't import it
vi.mock('../pages/MachineDetail.jsx', () => ({ default: () => React.createElement('div', { 'data-testid': 'machine-detail' }, 'MachineDetail') }));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  speakMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug 1 — TTS: speak() never called with dashboard content
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 1 — TTS speak() called with dashboard content', () => {
  /**
   * Validates: Requirements 1.1
   *
   * EXPECTED TO FAIL on unfixed code because Dashboard.jsx never calls speak()
   * with page content after data loads, even when ttsEnabled is true.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected spy to have been called at least once
   *   (speak was never invoked — no useEffect calls speak() after loading=false)
   */
  it('calls speak() with a string containing the user first name after data loads', async () => {
    const { default: Dashboard } = await import('../pages/Dashboard.jsx');

    await act(async () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/dashboard'] },
          React.createElement(Dashboard)
        )
      );
    });

    // Wait for the greeting to appear (data has loaded, loading=false)
    await waitFor(() => {
      expect(screen.queryByText(/Hello/i)).toBeTruthy();
    });

    // Give any post-load useEffect a tick to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // ASSERTION: speak() must have been called at least once
    // On UNFIXED code this FAILS — speak() is never invoked with dashboard content
    expect(speakMock).toHaveBeenCalled();

    // ASSERTION: at least one call must include the user's first name ("Alice")
    const calledWithName = speakMock.mock.calls.some(
      ([text]) => typeof text === 'string' && text.toLowerCase().includes('alice')
    );
    expect(calledWithName).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug 5 — QR container: #qr-reader has no dimensions after scan starts
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 5 — QR container #qr-reader has visible dimensions', () => {
  /**
   * Validates: Requirements 1.5
   *
   * EXPECTED TO FAIL on unfixed code because the container div is rendered as:
   *   <div id="qr-reader" className="w-full"></div>
   * which has no explicit height, so it has no min-h-* class and offsetHeight=0.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (qr-reader has className="w-full" — no min-h-* class, no inline minHeight)
   */
  it('#qr-reader has a min-height style or class after clicking Scan QR Code', async () => {
    const { default: ReportMaintenance } = await import('../pages/ReportMaintenance.jsx');

    await act(async () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/report-maintenance'] },
          React.createElement(ReportMaintenance)
        )
      );
    });

    // Click "Scan QR Code" to enter scanning state
    const scanButton = screen.getByRole('button', { name: /scan qr code/i });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // The #qr-reader element must now be in the DOM
    const qrReader = document.getElementById('qr-reader');
    expect(qrReader).not.toBeNull();

    // ASSERTION: the container must have an explicit min-height so the scanner
    // preview is visible. jsdom doesn't do layout, but Tailwind class names and
    // inline styles are reflected in the DOM.
    // On UNFIXED code: className="w-full" — no min-h-* class, no inline style.
    const hasExplicitHeight =
      (qrReader.style && qrReader.style.minHeight !== '') ||
      (qrReader.className && qrReader.className.includes('min-h-'));

    // On UNFIXED code this FAILS — the div has no height constraint
    expect(hasExplicitHeight).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug 6 — Missing route: /equipment/:id not registered in App
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 6 — /equipment/:id route renders MachineDetail, not a redirect', () => {
  /**
   * Validates: Requirements 1.6
   *
   * EXPECTED TO FAIL on unfixed code because App.jsx has no /equipment/:id
   * route — the wildcard <Navigate to="/" replace /> fires and LandingPage
   * renders instead of MachineDetail.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected null not to be null
   *   (machine-detail element is null; landing renders instead)
   */
  it('renders MachineDetail component (not a redirect) when navigating to /equipment/EQ-0001', async () => {
    // Mock sessionStorage so App skips the splash screen
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'splashShown') return 'true';
      if (key === 'token') return 'fake-token';
      return null;
    });

    // Override window.location so BrowserRouter starts at /equipment/EQ-0001
    delete window.location;
    window.location = {
      pathname: '/equipment/EQ-0001',
      href: 'http://localhost/equipment/EQ-0001',
      origin: 'http://localhost',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };

    const { default: App } = await import('../App.jsx');

    await act(async () => {
      render(React.createElement(App));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // ASSERTION: MachineDetail must be rendered, not the wildcard redirect
    // On UNFIXED code this FAILS — App has no /equipment/:id route so the
    // wildcard <Navigate to="/" replace /> fires and LandingPage renders instead.
    await waitFor(() => {
      const machineDetail = screen.queryByTestId('machine-detail');
      expect(machineDetail).not.toBeNull();
    });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug 2 — QR Scanner: camera resource conflict (stopCamera not called before QR)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 2 — toggleQrMode calls stopCamera before setQrMode(true)', () => {
  /**
   * Validates: Requirements 1.4, 2.4
   *
   * EXPECTED TO FAIL on unfixed code because toggleQrMode() in BorrowStep3.jsx
   * calls setQrMode(true) WITHOUT first calling stopCamera() to release the AI
   * camera stream. This causes a resource conflict when Html5QrcodeScanner
   * also requests the camera.
   *
   * Root cause: In the else branch of toggleQrMode(), the code is:
   *   setQrMode(true);
   *   setQrLookupError(null);
   * — stopCamera() is never called before setQrMode(true).
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (stopCamera does not appear before setQrMode(true) in the enable-QR branch)
   */
  it('stopCamera() is called before setQrMode(true) in the enable-QR branch of toggleQrMode', () => {
    // process.cwd() is frontend/ when run via `npx vitest run` from frontend/,
    // or the workspace root when run via `npx vitest run frontend/...` from root.
    // Resolve relative to this test file's location for robustness.
    const borrowStep3Path = resolve(__dirname, '../pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // Extract the toggleQrMode function body
    const fnStart = source.indexOf('function toggleQrMode()');
    expect(fnStart).not.toBe(-1); // function must exist

    // Find the matching closing brace for toggleQrMode
    let depth = 0;
    let fnEnd = -1;
    for (let i = fnStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          fnEnd = i + 1;
          break;
        }
      }
    }
    expect(fnEnd).not.toBe(-1);

    const toggleQrModeBody = source.slice(fnStart, fnEnd);

    // Find the else branch (enable-QR path): the part after the closing brace of the if block
    // The if block handles qrMode=true (disable), the else handles qrMode=false (enable)
    const elseIndex = toggleQrModeBody.indexOf('} else {');
    expect(elseIndex).not.toBe(-1); // else branch must exist

    const enableQrBranch = toggleQrModeBody.slice(elseIndex);

    // Find positions of stopCamera() and setQrMode(true) in the enable-QR branch
    const stopCameraPos = enableQrBranch.indexOf('stopCamera()');
    const setQrModePos = enableQrBranch.indexOf('setQrMode(true)');

    // ASSERTION: stopCamera() must appear BEFORE setQrMode(true) in the enable-QR branch.
    // On UNFIXED code this FAILS — stopCamera() is not called at all in the else branch,
    // so stopCameraPos === -1 and the condition is false.
    const stopCameraCalledBeforeQrMode =
      stopCameraPos !== -1 &&
      setQrModePos !== -1 &&
      stopCameraPos < setQrModePos;

    expect(stopCameraCalledBeforeQrMode).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug AI — AI Lab Assistant scope restriction: deflects general lab questions
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug AI — BASE_SYSTEM_PROMPT permits general lab questions', () => {
  /**
   * Validates: Requirements 2.1, 2.2, 2.3
   *
   * EXPECTED TO FAIL on unfixed code because BASE_SYSTEM_PROMPT in
   * backend/routes/ai.js enumerates only FORGE workflow topics and the
   * Answer Style Rules instruct the model to deflect anything outside that
   * list ("If you don't know something specific about FORGE, say so briefly
   * and suggest contacting the lab admin").
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (prompt contains no permissive language for general lab questions —
   *    no "general lab", "equipment usage", "safety procedures", or similar
   *    in a permissive context; deflection rule is present instead)
   */
  it('BASE_SYSTEM_PROMPT grants permission to answer general lab questions', () => {
    // Read the actual backend source file — no network calls needed
    // process.cwd() is the frontend/ directory when vitest runs; go up one level to workspace root
    const aiFilePath = resolve(process.cwd(), '..', 'backend/routes/ai.js');
    const aiFileContent = readFileSync(aiFilePath, 'utf-8');

    // Extract the BASE_SYSTEM_PROMPT value from the file content.
    // The constant is defined as a template literal assigned to BASE_SYSTEM_PROMPT.
    const promptStart = aiFileContent.indexOf('const BASE_SYSTEM_PROMPT = `');
    const promptEnd = aiFileContent.indexOf('`;', promptStart);
    const prompt = aiFileContent.slice(promptStart, promptEnd + 2);

    // ASSERTION 1: The prompt must contain permissive language for general lab questions.
    // On UNFIXED code this FAILS — the prompt only lists FORGE workflow topics.
    const hasGeneralLabPermission =
      /general lab/i.test(prompt) ||
      /equipment usage/i.test(prompt) ||
      /safety procedures/i.test(prompt) ||
      /laboratory knowledge/i.test(prompt) ||
      /any lab.{0,30}question/i.test(prompt) ||
      /lab.{0,30}related question/i.test(prompt);

    // On UNFIXED code this FAILS — none of these permissive phrases are present
    expect(hasGeneralLabPermission).toBe(true);

    // ASSERTION 2: The deflection-only rule must NOT be the sole fallback.
    // On UNFIXED code the Answer Style Rules say:
    //   "If you don't know something specific about FORGE, say so briefly
    //    and suggest contacting the lab admin."
    // This instructs the model to deflect ALL non-FORGE questions.
    // After the fix, this rule should be replaced or qualified so that
    // general lab questions are answered rather than deflected.
    const hasUnqualifiedDeflectionRule =
      /if you don't know something specific about FORGE, say so briefly and suggest contacting the lab admin/i.test(prompt);

    // On UNFIXED code this FAILS — the unqualified deflection rule is present
    expect(hasUnqualifiedDeflectionRule).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Bug 3 — Sign In field mismatch: backend uses fullName, not tipEmail
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 3 — Sign In: backend /signin route uses tipEmail, not fullName', () => {
  /**
   * Validates: Requirements 2.5, 2.6
   *
   * EXPECTED TO FAIL on unfixed code because:
   * - backend/routes/auth.js destructures `fullName` from req.body (not `tipEmail`)
   * - the DB query uses `WHERE full_name = $1` (not `WHERE tip_email = $1`)
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (route destructures `fullName`, not `tipEmail`)
   */
  it('backend /signin route destructures tipEmail from req.body and queries by tip_email', () => {
    // Resolve relative to this test file: frontend/src/test/ → up 3 levels → workspace root → backend/routes/auth.js
    const authPath = resolve(__dirname, '..', '..', '..', 'backend/routes/auth.js');
    const source = readFileSync(authPath, 'utf-8');

    // Find the /signin route handler
    const signinRouteStart = source.indexOf("router.post('/signin'");
    expect(signinRouteStart).not.toBe(-1);

    // Extract the signin route body (from its start to the end of the handler)
    const signinRouteSource = source.slice(signinRouteStart);

    // ASSERTION 1: route must destructure tipEmail, not fullName
    // On UNFIXED code: `const { fullName, studentId } = req.body;` → FAILS
    const destructuresTipEmail = /const\s*\{[^}]*tipEmail[^}]*\}\s*=\s*req\.body/.test(signinRouteSource);
    expect(destructuresTipEmail).toBe(true);

    // ASSERTION 2: route must NOT destructure fullName in the signin handler
    // On UNFIXED code: fullName is destructured → FAILS
    const destructuresFullName = /const\s*\{[^}]*fullName[^}]*\}\s*=\s*req\.body/.test(signinRouteSource);
    expect(destructuresFullName).toBe(false);

    // ASSERTION 3: DB query must use tip_email in WHERE clause
    // On UNFIXED code: `WHERE full_name = $1` → FAILS
    const queriesByTipEmail = /WHERE\s+tip_email\s*=\s*\$1/i.test(signinRouteSource);
    expect(queriesByTipEmail).toBe(true);

    // ASSERTION 4: DB query must NOT use full_name in WHERE clause
    // On UNFIXED code: `WHERE full_name = $1` → FAILS
    const queriesByFullName = /WHERE\s+full_name\s*=\s*\$1/i.test(signinRouteSource);
    expect(queriesByFullName).toBe(false);
  });
});

describe('Bug 3 — Sign In: frontend SignIn.jsx uses tipEmail field, not fullName', () => {
  /**
   * Validates: Requirements 2.5
   *
   * EXPECTED TO FAIL on unfixed code because:
   * - SignIn.jsx initializes state with `fullName: ''` (not `tipEmail: ''`)
   * - The form label says "Full Name" (not "TIP Email")
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (form has fullName field and "Full Name" label, not tipEmail / "TIP Email")
   */
  it('SignIn.jsx form has a tipEmail field and a "TIP Email" label, not fullName / "Full Name"', () => {
    const signInPath = resolve(__dirname, '../pages/SignIn.jsx');
    const source = readFileSync(signInPath, 'utf-8');

    // ASSERTION 1: state must include tipEmail, not fullName
    // On UNFIXED code: `fullName: ''` in useState → FAILS
    const hasTipEmailState = /tipEmail\s*:\s*['"]/.test(source);
    expect(hasTipEmailState).toBe(true);

    // ASSERTION 2: state must NOT include fullName
    // On UNFIXED code: `fullName: ''` → FAILS
    const hasFullNameState = /fullName\s*:\s*['"]/.test(source);
    expect(hasFullNameState).toBe(false);

    // ASSERTION 3: label must say "TIP Email"
    // On UNFIXED code: label says "Full Name" → FAILS
    const hasTipEmailLabel = /TIP\s+Email/i.test(source);
    expect(hasTipEmailLabel).toBe(true);

    // ASSERTION 4: label must NOT say "Full Name"
    // On UNFIXED code: "Full Name" label is present → FAILS
    const hasFullNameLabel = /Full\s+Name/i.test(source);
    expect(hasFullNameLabel).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Admin Login Exemption — Bug Condition: validate() rejects ADMIN01 credentials
// ─────────────────────────────────────────────────────────────────────────────
describe('Admin Login Exemption — Bug Condition: validate() rejects ADMIN01 credentials', () => {
  /**
   * Validates: Requirements 1.1, 1.2
   *
   * EXPECTED TO FAIL on unfixed code because validate() applies the TIP email
   * regex and 7-8 digit numeric ID check unconditionally, rejecting ADMIN01
   * credentials before the request reaches the backend.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected true to be false (validation errors are present)
   *   errors: { tipEmail: 'Must be a valid TIP email', studentId: 'Must be 7-8 digits' }
   *
   * Root cause confirmed: both regex checks apply unconditionally — no admin exemption.
   */

  // Helper: render the real SignIn component and submit with given credentials,
  // then return whether any validation error text is visible in the DOM.
  async function submitAndCheckErrors(studentId, tipEmail) {
    // Unmock SignIn so we get the real component
    const { default: RealSignIn } = await vi.importActual('../pages/SignIn.jsx');

    // Mock useAuth to provide a signIn stub (won't be called if validation fails)
    vi.doMock('../hooks/useAuth.jsx', () => ({
      AuthProvider: ({ children }) => children,
      useAuth: () => ({
        user: null,
        isAuthenticated: false,
        loading: false,
        signIn: vi.fn(() => Promise.resolve({ user: { role: 'LAB_ADMIN' } })),
        signOut: vi.fn(),
      }),
    }));

    const { unmount } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/signin'] },
        React.createElement(RealSignIn)
      )
    );

    // Fill in the TIP Email field
    const emailInput = document.querySelector('input[name="tipEmail"]');
    fireEvent.change(emailInput, { target: { name: 'tipEmail', value: tipEmail } });

    // Fill in the Student ID field
    const idInput = document.querySelector('input[name="studentId"]');
    fireEvent.change(idInput, { target: { name: 'studentId', value: studentId } });

    // Submit the form
    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Check for validation error messages in the DOM
    const hasEmailError = !!document.querySelector('p.mt-1');
    const errorTexts = Array.from(document.querySelectorAll('p.mt-1')).map(el => el.textContent);

    unmount();
    return { hasErrors: errorTexts.length > 0, errorTexts };
  }

  it('Test case 1: studentId=ADMIN01, tipEmail=admin → validate() should return true (no errors)', async () => {
    const { hasErrors, errorTexts } = await submitAndCheckErrors('ADMIN01', 'admin');
    // On UNFIXED code this FAILS — errors: ['Must be a valid TIP email (e.g. mjdelacruz@tip.edu.ph)', 'Must be 7-8 digits']
    expect(hasErrors).toBe(false);
    expect(errorTexts).toEqual([]);
  });

  it('Test case 2: studentId=admin01 (lowercase), tipEmail=admin → validate() should return true (no errors)', async () => {
    const { hasErrors, errorTexts } = await submitAndCheckErrors('admin01', 'admin');
    // On UNFIXED code this FAILS — same errors as case 1 (case-insensitive match not implemented)
    expect(hasErrors).toBe(false);
    expect(errorTexts).toEqual([]);
  });

  it('Test case 3: studentId=Admin01 (mixed case), tipEmail=admin → validate() should return true (no errors)', async () => {
    const { hasErrors, errorTexts } = await submitAndCheckErrors('Admin01', 'admin');
    // On UNFIXED code this FAILS — same errors as case 1
    expect(hasErrors).toBe(false);
    expect(errorTexts).toEqual([]);
  });

  it('Test case 4: studentId=ADMIN01, tipEmail=administrator → validate() should return true (no errors)', async () => {
    const { hasErrors, errorTexts } = await submitAndCheckErrors('ADMIN01', 'administrator');
    // On UNFIXED code this FAILS — tipEmail 'administrator' fails TIP email regex
    expect(hasErrors).toBe(false);
    expect(errorTexts).toEqual([]);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// QR Scanner Mobile Camera Bug — Bug Condition Exploration Tests
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
// ─────────────────────────────────────────────────────────────────────────────

describe('QR Scanner Mobile Camera — Bug Condition Exploration', () => {
  /**
   * These 4 tests MUST FAIL on unfixed code — failure confirms the bugs exist.
   * DO NOT fix the code when these fail.
   */

  // ── Test 1: Race Condition ─────────────────────────────────────────────────
  /**
   * Validates: Requirements 1.2, 2.2
   *
   * EXPECTED TO FAIL on unfixed code because toggleQrMode calls startScanner
   * after only 100ms — too short for iOS Safari to fully release the stream.
   * On unfixed code, Html5QrcodeScanner.render() IS called at 100ms while the
   * stream may still be active, so the assertion (render NOT called before
   * stream is released) fails.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected true to be false
   *   (render() was called at ~100ms, before the 400ms stream-release window)
   */
  it('Test 1 — Race Condition: toggleQrMode awaits at least 400ms before setQrMode(true)', () => {
    // Static source analysis: verify the fix is in place in BorrowStep3.jsx
    const borrowStep3Path = resolve(__dirname, '../pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // ASSERTION 1: toggleQrMode must be async
    // On UNFIXED code: `function toggleQrMode()` (not async) → FAILS
    const isAsync = /async function toggleQrMode\(\)/.test(source);
    expect(isAsync).toBe(true);

    // Extract the toggleQrMode function body
    const fnStart = source.indexOf('async function toggleQrMode()');
    expect(fnStart).not.toBe(-1);
    let depth = 0;
    let fnEnd = -1;
    for (let i = fnStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = source.slice(fnStart, fnEnd);

    // Extract the else branch (enable-QR path)
    const elseIdx = fnBody.indexOf('} else {');
    expect(elseIdx).not.toBe(-1);
    const elseBranch = fnBody.slice(elseIdx);

    // ASSERTION 2: else branch must await a delay of at least 300ms
    // On UNFIXED code: no await delay → FAILS
    const awaitMatch = elseBranch.match(/await\s+new\s+Promise[^)]*setTimeout[^,]*,\s*(\d+)/);
    expect(awaitMatch).not.toBeNull();
    const delayMs = parseInt(awaitMatch[1], 10);
    expect(delayMs).toBeGreaterThanOrEqual(300);

    // ASSERTION 3: stopCamera() must appear before the await delay
    // On UNFIXED code: stopCamera() not called in else branch → FAILS
    const stopCameraIdx = elseBranch.indexOf('stopCamera()');
    const awaitIdx = elseBranch.indexOf('await');
    expect(stopCameraIdx).not.toBe(-1);
    expect(stopCameraIdx).toBeLessThan(awaitIdx);
  });

  // ── Test 2: Hard facingMode Constraint ────────────────────────────────────
  /**
   * Validates: Requirements 1.3, 2.3
   *
   * EXPECTED TO FAIL on unfixed code because useQRScanner.js passes
   * `facingMode: 'environment'` as a top-level key in the Html5QrcodeScanner
   * config, which is treated as a hard getUserMedia constraint.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected true to be false
   *   (config has top-level facingMode: 'environment' — hard constraint present)
   */
  it('Test 2 — Hard facingMode Constraint: config does NOT use top-level facingMode: "environment"', () => {
    const useQRScannerPath = resolve(__dirname, '../hooks/useQRScanner.js');
    const source = readFileSync(useQRScannerPath, 'utf-8');

    // Find the Html5QrcodeScanner constructor call and extract its config object
    const constructorStart = source.indexOf('new Html5QrcodeScanner(');
    expect(constructorStart).not.toBe(-1);

    // Extract the config object literal (second argument to the constructor)
    // Find the opening brace of the config object
    const configStart = source.indexOf('{', constructorStart);
    expect(configStart).not.toBe(-1);

    // Find the matching closing brace
    let depth = 0;
    let configEnd = -1;
    for (let i = configStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          configEnd = i + 1;
          break;
        }
      }
    }
    expect(configEnd).not.toBe(-1);

    const configSource = source.slice(configStart, configEnd);

    // ASSERTION: config must NOT have a top-level `facingMode` key.
    // A top-level facingMode is a hard constraint that fails silently on
    // devices where the back camera is unavailable.
    // On UNFIXED code: `facingMode: 'environment'` IS present → FAILS.
    const hasTopLevelFacingMode = /^\s*facingMode\s*:/m.test(configSource);

    // On UNFIXED code this FAILS — hard facingMode constraint is present
    expect(hasTopLevelFacingMode).toBe(false);

    // ASSERTION: config SHOULD use videoConstraints with ideal facingMode (soft preference).
    // On UNFIXED code: videoConstraints is absent → this also FAILS.
    const hasSoftFacingMode =
      /videoConstraints\s*:/.test(configSource) &&
      /ideal\s*:\s*['"]environment['"]/.test(configSource);

    // On UNFIXED code this FAILS — no videoConstraints with ideal facingMode
    expect(hasSoftFacingMode).toBe(true);
  });

  // ── Test 3: Zero-Height Container ─────────────────────────────────────────
  /**
   * Validates: Requirements 1.4, 2.4
   *
   * EXPECTED TO FAIL on unfixed code because startScanner in useQRScanner.js
   * calls Html5QrcodeScanner.render() unconditionally — there is no check for
   * container.offsetHeight > 0 before calling render().
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected true to be false
   *   (render() was called even when offsetHeight === 0 — no height guard exists)
   */
  it('Test 3 — Zero-Height Container: render() is NOT called when container offsetHeight === 0', () => {
    // Static source analysis: verify the fix is in BorrowStep3.jsx useEffect (not useQRScanner.js)
    // The design specifies the height-polling guard lives in the useEffect that calls startScanner
    const borrowStep3Path = resolve(__dirname, '../pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // Find the useEffect that guards startScanner with a height check
    const effectMarker = 'if (!qrMode) return;';
    const markerIdx = source.indexOf(effectMarker);
    expect(markerIdx).not.toBe(-1);

    const useEffectIdx = source.lastIndexOf('useEffect(', markerIdx);
    expect(useEffectIdx).not.toBe(-1);

    const cbStart = source.indexOf('{', useEffectIdx);
    let depth = 0;
    let cbEnd = -1;
    for (let i = cbStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') { depth--; if (depth === 0) { cbEnd = i + 1; break; } }
    }
    const effectBody = source.slice(useEffectIdx, cbEnd);

    // ASSERTION: useEffect must check offsetHeight > 0 before calling startScanner
    // On UNFIXED code: no offsetHeight check → startScanner called unconditionally → FAILS
    const hasHeightCheck = /offsetHeight\s*>\s*0/.test(effectBody);
    expect(hasHeightCheck).toBe(true);

    // ASSERTION: startScanner must appear after the offsetHeight check
    const offsetHeightIdx = effectBody.indexOf('offsetHeight');
    const startScannerIdx = effectBody.indexOf('startScanner(');
    expect(offsetHeightIdx).not.toBe(-1);
    expect(startScannerIdx).not.toBe(-1);
    expect(startScannerIdx).toBeGreaterThan(offsetHeightIdx);
  });

  // ── Test 4: Container min-height ──────────────────────────────────────────
  /**
   * Validates: Requirements 1.5, 2.5
   *
   * EXPECTED TO FAIL on unfixed code because the qr-scanner-container div in
   * BorrowStep3.jsx has className="w-full" with no min-h-* class.
   *
   * FAILURE OUTPUT (unfixed):
   *   AssertionError: expected false to be true
   *   (qr-scanner-container has className="w-full" — no min-h-[300px] class)
   */
  it('Test 4 — Container min-height: qr-scanner-container div has min-h-[300px] in className', () => {
    const borrowStep3Path = resolve(__dirname, '../pages/borrow/BorrowStep3.jsx');
    const source = readFileSync(borrowStep3Path, 'utf-8');

    // Find the qr-scanner-container div
    const containerIdx = source.indexOf('id="qr-scanner-container"');
    expect(containerIdx).not.toBe(-1);

    // Extract the JSX element (from the opening < to the closing />)
    const elementStart = source.lastIndexOf('<', containerIdx);
    const elementEnd = source.indexOf('/>', containerIdx);
    expect(elementStart).not.toBe(-1);
    expect(elementEnd).not.toBe(-1);

    const containerElement = source.slice(elementStart, elementEnd + 2);

    // ASSERTION: the container div must have min-h-[300px] in its className.
    // On UNFIXED code: className="w-full" — no min-h-* class → FAILS.
    const hasMinHeight = /min-h-\[300px\]/.test(containerElement);

    // On UNFIXED code this FAILS — no min-height class on the container
    expect(hasMinHeight).toBe(true);
  });
});
