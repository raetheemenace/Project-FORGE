/**
 * Fix-Checking Tests
 * These tests MUST PASS on fixed code — they verify the bugs have been corrected.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Property 1 — AI answers general lab questions (fix check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 1 — AI answers general lab questions (fix check)', () => {
  /**
   * Validates: Requirements 2.1, 2.2, 2.3
   *
   * Verifies that the fixed BASE_SYSTEM_PROMPT in backend/routes/ai.js:
   *  1. Contains permissive language granting permission to answer general lab questions
   *  2. Does NOT contain the unqualified deflection rule
   *  3. Contains a "General Lab Knowledge" section (or equivalent)
   */
  it('BASE_SYSTEM_PROMPT contains permissive language for general lab questions', () => {
    // __dirname is frontend/src/test — go up 3 levels to workspace root, then into backend
    const aiFilePath = resolve(__dirname, '..', '..', '..', 'backend/routes/ai.js');
    const aiFileContent = readFileSync(aiFilePath, 'utf-8');

    // Extract the BASE_SYSTEM_PROMPT value
    const promptStart = aiFileContent.indexOf('const BASE_SYSTEM_PROMPT = `');
    expect(promptStart).not.toBe(-1);
    const promptEnd = aiFileContent.indexOf('`;', promptStart);
    expect(promptEnd).not.toBe(-1);
    const prompt = aiFileContent.slice(promptStart, promptEnd + 2);

    // ASSERTION 1: prompt must contain permissive language for general lab questions
    const hasGeneralLabPermission =
      /general lab/i.test(prompt) ||
      /equipment usage/i.test(prompt) ||
      /safety procedures/i.test(prompt) ||
      /laboratory knowledge/i.test(prompt) ||
      /any lab.{0,30}question/i.test(prompt) ||
      /lab.{0,30}related question/i.test(prompt);

    expect(hasGeneralLabPermission).toBe(true);
  });

  it('BASE_SYSTEM_PROMPT does NOT contain the unqualified deflection rule', () => {
    const aiFilePath = resolve(__dirname, '..', '..', '..', 'backend/routes/ai.js');
    const aiFileContent = readFileSync(aiFilePath, 'utf-8');

    const promptStart = aiFileContent.indexOf('const BASE_SYSTEM_PROMPT = `');
    const promptEnd = aiFileContent.indexOf('`;', promptStart);
    const prompt = aiFileContent.slice(promptStart, promptEnd + 2);

    // ASSERTION 2: the unqualified deflection rule must NOT be present
    const hasUnqualifiedDeflectionRule =
      /if you don't know something specific about FORGE, say so briefly and suggest contacting the lab admin/i.test(prompt);

    expect(hasUnqualifiedDeflectionRule).toBe(false);
  });

  it('BASE_SYSTEM_PROMPT contains a "General Lab Knowledge" section or equivalent', () => {
    const aiFilePath = resolve(__dirname, '..', '..', '..', 'backend/routes/ai.js');
    const aiFileContent = readFileSync(aiFilePath, 'utf-8');

    const promptStart = aiFileContent.indexOf('const BASE_SYSTEM_PROMPT = `');
    const promptEnd = aiFileContent.indexOf('`;', promptStart);
    const prompt = aiFileContent.slice(promptStart, promptEnd + 2);

    // ASSERTION 3: prompt must contain a "General Lab Knowledge" section or equivalent heading
    const hasGeneralLabSection =
      /##\s*General Lab Knowledge/i.test(prompt) ||
      /general laboratory knowledge/i.test(prompt) ||
      /authorized to answer ANY laboratory/i.test(prompt);

    expect(hasGeneralLabSection).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 3 — QR scanner decodes when AI camera was active (fix check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 3 — QR scanner decodes when AI camera was active (fix check)', () => {
  /**
   * Validates: Requirements 2.4
   *
   * Verifies that the fixed toggleQrMode in BorrowStep3.jsx:
   *  1. In the else branch (enable-QR path): stopCamera() appears BEFORE setQrMode(true)
   *  2. In the if branch (disable-QR path): startCamera() appears AFTER setQrMode(false)
   */

  let toggleQrModeBody;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'pages', 'borrow', 'BorrowStep3.jsx');
    const source = readFileSync(filePath, 'utf-8');

    // Extract the toggleQrMode function body
    const fnStart = source.indexOf('function toggleQrMode()');
    expect(fnStart).not.toBe(-1);

    // Find the matching closing brace by counting braces
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
    toggleQrModeBody = source.slice(fnStart, fnEnd);
  });

  it('else branch (enable-QR path): stopCamera() appears before setQrMode(true)', () => {
    // Locate the else branch
    const elseIdx = toggleQrModeBody.indexOf('} else {');
    expect(elseIdx).not.toBe(-1);
    const elseBranch = toggleQrModeBody.slice(elseIdx);

    const stopCameraIdx = elseBranch.indexOf('stopCamera()');
    const setQrModeTrueIdx = elseBranch.indexOf('setQrMode(true)');

    expect(stopCameraIdx).not.toBe(-1);
    expect(setQrModeTrueIdx).not.toBe(-1);
    expect(stopCameraIdx).toBeLessThan(setQrModeTrueIdx);
  });

  it('if branch (disable-QR path): startCamera() appears after setQrMode(false)', () => {
    // The if branch starts right after 'function toggleQrMode() {' and ends before '} else {'
    const ifBodyStart = toggleQrModeBody.indexOf('{') + 1;
    const elseIdx = toggleQrModeBody.indexOf('} else {');
    expect(elseIdx).not.toBe(-1);
    const ifBranch = toggleQrModeBody.slice(ifBodyStart, elseIdx);

    const setQrModeFalseIdx = ifBranch.indexOf('setQrMode(false)');
    const startCameraIdx = ifBranch.indexOf('startCamera()');

    expect(setQrModeFalseIdx).not.toBe(-1);
    expect(startCameraIdx).not.toBe(-1);
    expect(startCameraIdx).toBeGreaterThan(setQrModeFalseIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5 — Sign In accepts TIP email: backend (fix check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 5 — Sign In accepts TIP email: backend (fix check)', () => {
  /**
   * Validates: Requirements 2.5, 2.6
   *
   * Verifies that the fixed /signin route in backend/routes/auth.js:
   *  1. Destructures tipEmail from req.body
   *  2. DB query uses WHERE tip_email = $1
   *  3. Validation message says "TIP email" (not "Full name")
   */

  let signinRouteSource;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', '..', '..', 'backend', 'routes', 'auth.js');
    signinRouteSource = readFileSync(filePath, 'utf-8');
  });

  // Helper: extract just the /signin route handler body (not the whole file)
  function extractSigninBlock(source) {
    const signinIdx = source.indexOf("router.post('/signin'");
    if (signinIdx === -1) return null;
    // Find the opening brace of the route callback
    const cbStart = source.indexOf('{', signinIdx);
    if (cbStart === -1) return null;
    // Walk braces to find the matching close
    let depth = 0;
    let end = -1;
    for (let i = cbStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    return end !== -1 ? source.slice(signinIdx, end) : null;
  }

  it('/signin route destructures tipEmail from req.body', () => {
    const signinBlock = extractSigninBlock(signinRouteSource);
    expect(signinBlock).not.toBeNull();

    // Must destructure tipEmail from req.body
    expect(/\btipEmail\b/.test(signinBlock)).toBe(true);

    // fullName must NOT be destructured from req.body (it may appear in the response object, but not as a credential)
    expect(/const\s*\{[^}]*fullName[^}]*\}\s*=\s*req\.body/.test(signinBlock)).toBe(false);
  });

  it('DB query uses WHERE tip_email = $1', () => {
    const signinBlock = extractSigninBlock(signinRouteSource);
    expect(signinBlock).not.toBeNull();

    expect(/WHERE\s+tip_email\s*=\s*\$1/i.test(signinBlock)).toBe(true);
    expect(/WHERE\s+full_name\s*=\s*\$1/i.test(signinBlock)).toBe(false);
  });

  it('validation message says "TIP email" (not "Full name")', () => {
    const signinBlock = extractSigninBlock(signinRouteSource);
    expect(signinBlock).not.toBeNull();

    // Validation error message must reference TIP email
    expect(/TIP email/i.test(signinBlock)).toBe(true);
    expect(/Full name/i.test(signinBlock)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5 — Sign In accepts TIP email: frontend form (fix check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 5 — Sign In accepts TIP email: frontend form (fix check)', () => {
  /**
   * Validates: Requirements 2.5, 2.6
   *
   * Verifies that the fixed SignIn.jsx:
   *  1. State has tipEmail field (not fullName)
   *  2. Label says "TIP Email"
   *  3. Input type is email
   */

  let signInSource;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'pages', 'SignIn.jsx');
    signInSource = readFileSync(filePath, 'utf-8');
  });

  it('state has tipEmail field (not fullName)', () => {
    expect(/tipEmail/.test(signInSource)).toBe(true);
    // fullName must not appear in state initializer
    const useStateIdx = signInSource.indexOf('useState({');
    expect(useStateIdx).not.toBe(-1);
    // Find the closing brace of the useState object
    let depth = 0;
    let stateEnd = -1;
    for (let i = useStateIdx + 'useState('.length; i < signInSource.length; i++) {
      if (signInSource[i] === '{') depth++;
      else if (signInSource[i] === '}') {
        depth--;
        if (depth === 0) { stateEnd = i + 1; break; }
      }
    }
    const stateBlock = signInSource.slice(useStateIdx, stateEnd);
    expect(/tipEmail/.test(stateBlock)).toBe(true);
    expect(/fullName/.test(stateBlock)).toBe(false);
  });

  it('label says "TIP Email"', () => {
    expect(/TIP Email/i.test(signInSource)).toBe(true);
    // Must not have a "Full Name" label
    expect(/Full Name/i.test(signInSource)).toBe(false);
  });

  it('input type is email', () => {
    // There must be an input with type="email" for the TIP email field
    expect(/type="email"/.test(signInSource)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5 — Sign In accepts TIP email: authService (fix check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 5 — Sign In accepts TIP email: authService (fix check)', () => {
  /**
   * Validates: Requirements 2.5, 2.6
   *
   * Verifies that the fixed authService.js:
   *  1. signIn function parameter is tipEmail (not fullName)
   *  2. POST body sends tipEmail
   */

  let authServiceSource;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'services', 'authService.js');
    authServiceSource = readFileSync(filePath, 'utf-8');
  });

  it('signIn function parameter is tipEmail (not fullName)', () => {
    // Extract the signIn function signature
    const fnIdx = authServiceSource.indexOf('export async function signIn(');
    expect(fnIdx).not.toBe(-1);
    // Get the parameter list (up to the closing paren)
    const parenEnd = authServiceSource.indexOf(')', fnIdx);
    const signature = authServiceSource.slice(fnIdx, parenEnd + 1);

    expect(/tipEmail/.test(signature)).toBe(true);
    expect(/fullName/.test(signature)).toBe(false);
  });

  it('POST body sends tipEmail', () => {
    // Extract the signIn function body
    const fnIdx = authServiceSource.indexOf('export async function signIn(');
    expect(fnIdx).not.toBe(-1);
    let depth = 0;
    let fnEnd = -1;
    for (let i = fnIdx; i < authServiceSource.length; i++) {
      if (authServiceSource[i] === '{') depth++;
      else if (authServiceSource[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const fnBody = authServiceSource.slice(fnIdx, fnEnd);

    // POST body must include tipEmail
    expect(/tipEmail/.test(fnBody)).toBe(true);
    expect(/fullName/.test(fnBody)).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// QR Scanner Mobile Camera Fixes (fix checks)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fix 1 — facingMode config uses videoConstraints (fix check)', () => {
  /**
   * Validates: Requirements 2.3
   *
   * Verifies that useQRScanner.js uses videoConstraints: { facingMode: { ideal: 'environment' } }
   * and does NOT have a top-level facingMode key in the Html5QrcodeScanner config.
   */

  let useQRScannerSource;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'hooks', 'useQRScanner.js');
    useQRScannerSource = readFileSync(filePath, 'utf-8');
  });

  it('config uses videoConstraints with facingMode ideal environment', () => {
    // Must have videoConstraints: { facingMode: { ideal: 'environment' } }
    expect(/videoConstraints\s*:\s*\{[^}]*facingMode\s*:\s*\{[^}]*ideal\s*:\s*['"]environment['"]/.test(useQRScannerSource)).toBe(true);
  });

  it('config does NOT have a top-level facingMode key', () => {
    // Extract the Html5QrcodeScanner config object (between the constructor call braces)
    const constructorIdx = useQRScannerSource.indexOf('new Html5QrcodeScanner(');
    expect(constructorIdx).not.toBe(-1);

    // Find the config object — second argument (after elementId)
    // Locate the opening brace of the config object
    const firstComma = useQRScannerSource.indexOf(',', constructorIdx);
    expect(firstComma).not.toBe(-1);
    const configStart = useQRScannerSource.indexOf('{', firstComma);
    expect(configStart).not.toBe(-1);

    // Walk braces to find the matching close brace
    let depth = 0;
    let configEnd = -1;
    for (let i = configStart; i < useQRScannerSource.length; i++) {
      if (useQRScannerSource[i] === '{') depth++;
      else if (useQRScannerSource[i] === '}') {
        depth--;
        if (depth === 0) { configEnd = i + 1; break; }
      }
    }
    expect(configEnd).not.toBe(-1);
    const configBlock = useQRScannerSource.slice(configStart, configEnd);

    // Top-level facingMode key would look like: facingMode: 'environment' or facingMode: "environment"
    // It must NOT appear as a direct property (not nested inside videoConstraints)
    // We check that facingMode does not appear outside of a nested object
    // Strategy: remove the videoConstraints sub-object, then check no facingMode remains
    const videoConstraintsStart = configBlock.indexOf('videoConstraints');
    let strippedConfig = configBlock;
    if (videoConstraintsStart !== -1) {
      const vcBraceStart = configBlock.indexOf('{', videoConstraintsStart);
      if (vcBraceStart !== -1) {
        let d = 0;
        let vcEnd = -1;
        for (let i = vcBraceStart; i < configBlock.length; i++) {
          if (configBlock[i] === '{') d++;
          else if (configBlock[i] === '}') {
            d--;
            if (d === 0) { vcEnd = i + 1; break; }
          }
        }
        if (vcEnd !== -1) {
          strippedConfig = configBlock.slice(0, videoConstraintsStart) + configBlock.slice(vcEnd);
        }
      }
    }

    // After removing videoConstraints block, there must be no top-level facingMode key
    expect(/\bfacingMode\s*:/.test(strippedConfig)).toBe(false);
  });
});

describe('Fix 2 — toggleQrMode has async delay before scanner init (fix check)', () => {
  /**
   * Validates: Requirements 2.2
   *
   * Verifies that toggleQrMode is async and awaits at least 300ms after stopCamera()
   * before Html5QrcodeScanner constructor is called (via setQrMode(true) triggering useEffect).
   */

  let borrowStep3Source;
  let toggleQrModeBody;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'pages', 'borrow', 'BorrowStep3.jsx');
    borrowStep3Source = readFileSync(filePath, 'utf-8');

    // Extract toggleQrMode function body
    const fnStart = borrowStep3Source.indexOf('async function toggleQrMode()');
    expect(fnStart).not.toBe(-1);

    let depth = 0;
    let fnEnd = -1;
    for (let i = fnStart; i < borrowStep3Source.length; i++) {
      if (borrowStep3Source[i] === '{') depth++;
      else if (borrowStep3Source[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    expect(fnEnd).not.toBe(-1);
    toggleQrModeBody = borrowStep3Source.slice(fnStart, fnEnd);
  });

  it('toggleQrMode is declared as an async function', () => {
    expect(/async function toggleQrMode\(\)/.test(borrowStep3Source)).toBe(true);
  });

  it('else branch (enable-QR path) awaits a delay of at least 300ms before setQrMode(true)', () => {
    const elseIdx = toggleQrModeBody.indexOf('} else {');
    expect(elseIdx).not.toBe(-1);
    const elseBranch = toggleQrModeBody.slice(elseIdx);

    // Must have an await with setTimeout of at least 300ms
    // Matches: await new Promise(resolve => setTimeout(resolve, 400)) or similar
    const awaitDelayMatch = elseBranch.match(/await\s+new\s+Promise[^)]*setTimeout[^,]*,\s*(\d+)/);
    expect(awaitDelayMatch).not.toBeNull();

    const delayMs = parseInt(awaitDelayMatch[1], 10);
    expect(delayMs).toBeGreaterThanOrEqual(300);
  });

  it('else branch: stopCamera() appears before the await delay', () => {
    const elseIdx = toggleQrModeBody.indexOf('} else {');
    expect(elseIdx).not.toBe(-1);
    const elseBranch = toggleQrModeBody.slice(elseIdx);

    const stopCameraIdx = elseBranch.indexOf('stopCamera()');
    const awaitIdx = elseBranch.indexOf('await');

    expect(stopCameraIdx).not.toBe(-1);
    expect(awaitIdx).not.toBe(-1);
    expect(stopCameraIdx).toBeLessThan(awaitIdx);
  });
});

describe('Fix 3 — DOM-readiness polling before startScanner (fix check)', () => {
  /**
   * Validates: Requirements 2.4
   *
   * Verifies that the useEffect in BorrowStep3.jsx polls for offsetHeight > 0
   * before calling startScanner, rather than calling it blindly after a fixed delay.
   */

  let borrowStep3Source;
  let qrModeEffectBody;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'pages', 'borrow', 'BorrowStep3.jsx');
    borrowStep3Source = readFileSync(filePath, 'utf-8');

    // Extract the useEffect that depends on qrMode
    // Find the useEffect that contains startScanner and qrMode check
    const effectMarker = "if (!qrMode) return;";
    const markerIdx = borrowStep3Source.indexOf(effectMarker);
    expect(markerIdx).not.toBe(-1);

    // Walk backwards to find the useEffect( opening
    const useEffectIdx = borrowStep3Source.lastIndexOf('useEffect(', markerIdx);
    expect(useEffectIdx).not.toBe(-1);

    // Find the opening brace of the callback
    const cbStart = borrowStep3Source.indexOf('{', useEffectIdx);
    expect(cbStart).not.toBe(-1);

    // Walk braces to find the matching close
    let depth = 0;
    let cbEnd = -1;
    for (let i = cbStart; i < borrowStep3Source.length; i++) {
      if (borrowStep3Source[i] === '{') depth++;
      else if (borrowStep3Source[i] === '}') {
        depth--;
        if (depth === 0) { cbEnd = i + 1; break; }
      }
    }
    expect(cbEnd).not.toBe(-1);
    qrModeEffectBody = borrowStep3Source.slice(useEffectIdx, cbEnd);
  });

  it('useEffect checks offsetHeight > 0 before calling startScanner', () => {
    // Must check offsetHeight > 0 (or el.offsetHeight > 0)
    expect(/offsetHeight\s*>\s*0/.test(qrModeEffectBody)).toBe(true);
  });

  it('startScanner is called inside the polling condition (not unconditionally)', () => {
    // startScanner must appear after the offsetHeight check, not before it
    const offsetHeightIdx = qrModeEffectBody.indexOf('offsetHeight');
    const startScannerIdx = qrModeEffectBody.indexOf('startScanner(');

    expect(offsetHeightIdx).not.toBe(-1);
    expect(startScannerIdx).not.toBe(-1);
    // startScanner must come after the offsetHeight check
    expect(startScannerIdx).toBeGreaterThan(offsetHeightIdx);
  });

  it('polling loop has a retry limit to avoid infinite loops', () => {
    // Must have a MAX_RETRIES or similar guard
    expect(/MAX_RETRIES|maxRetries|retries\s*</.test(qrModeEffectBody)).toBe(true);
  });
});

describe('Fix 4 — qr-scanner-container has min-h-[300px] (fix check)', () => {
  /**
   * Validates: Requirements 2.5
   *
   * Verifies that the qr-scanner-container div in BorrowStep3.jsx
   * has min-h-[300px] in its className.
   */

  let borrowStep3Source;

  beforeAll(() => {
    const filePath = resolve(__dirname, '..', 'pages', 'borrow', 'BorrowStep3.jsx');
    borrowStep3Source = readFileSync(filePath, 'utf-8');
  });

  it('qr-scanner-container div has min-h-[300px] in className', () => {
    // Find the div with id="qr-scanner-container"
    const divIdx = borrowStep3Source.indexOf('id="qr-scanner-container"');
    expect(divIdx).not.toBe(-1);

    // Get the surrounding tag (look back for '<div' and forward for '/>' or '>')
    const tagStart = borrowStep3Source.lastIndexOf('<div', divIdx);
    expect(tagStart).not.toBe(-1);
    const tagEnd = borrowStep3Source.indexOf('>', divIdx);
    expect(tagEnd).not.toBe(-1);
    const divTag = borrowStep3Source.slice(tagStart, tagEnd + 1);

    expect(/min-h-\[300px\]/.test(divTag)).toBe(true);
  });
});
