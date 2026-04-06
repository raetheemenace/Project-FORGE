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
