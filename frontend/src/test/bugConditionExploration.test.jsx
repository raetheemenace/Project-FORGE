/**
 * Bug Condition Exploration Tests
 * Validates: Requirements 1.1, 1.5, 1.6
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the code when these fail.
 *
 * Bug 1  (TTS)           req 1.1 — speak() never called with dashboard content
 * Bug 5  (QR container)  req 1.5 — #qr-reader has no dimensions after scan starts
 * Bug 6  (missing route) req 1.6 — /equipment/:id has no route; hits wildcard redirect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
