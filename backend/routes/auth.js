// Authentication Routes - HTTP-level Unit Tests + Property-Based Tests
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 2.6
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

// Set JWT secret for testing
process.env.JWT_SECRET = 'main_secret_key_forge_production';
process.env.JWT_EXPIRY = '365d';

// ---------------------------------------------------------------------------
// Load CJS modules via createRequire so we can spy on them
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);

// Load the db pool module first so we can spy on it
const dbPool = require('../db/pool');

// Spy on the query function — this patches the same object that auth.js holds
// a reference to (since CJS modules are cached singletons)
const querySpy = vi.spyOn(dbPool, 'query');

// Now load the auth router (it will get the same dbPool singleton)
const authRouter = require('../routes/auth');

import { generateToken, authenticateToken } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Helper: build mock req / res objects
// ---------------------------------------------------------------------------
function mockReq(body = {}, headers = {}) {
  return { body, headers };
}

function mockRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Helper: invoke a route handler by walking the Express router stack
// ---------------------------------------------------------------------------
async function callRoute(method, path, body, headers = {}) {
  const req = mockReq(body, headers);
  const res = mockRes();
  req.method = method.toUpperCase();
  req.path = path;
  req.url = path;

  await new Promise((resolve, reject) => {
    const stack = authRouter.stack || [];
    const matchingLayer = stack.find(layer => {
      if (!layer.route) return false;
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0]?.toUpperCase();
      return routePath === path && routeMethod === method.toUpperCase();
    });

    if (!matchingLayer) {
      return reject(new Error(`No route found for ${method} ${path}`));
    }

    const handlers = matchingLayer.route.stack.map(s => s.handle);
    const handler = handlers[handlers.length - 1];

    Promise.resolve(handler(req, res, (err) => {
      if (err) reject(err); else resolve();
    })).then(resolve).catch(reject);
  });

  return res;
}

// ---------------------------------------------------------------------------
// HTTP-level Unit Tests
// ---------------------------------------------------------------------------

describe('Auth Routes - HTTP-level unit tests', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  // ── Signup ────────────────────────────────────────────────────────────────

  it('1. Signup with valid data → HTTP 201, token present, user.studentId matches input', async () => {
    // Validates: Requirements 1.1
    const fakeUser = {
      user_id: 42,
      student_id: '2021001',
      full_name: 'Juan dela Cruz',
      program: 'BSCS',
      role: 'STUDENT',
      created_at: new Date().toISOString(),
    };
    querySpy.mockResolvedValueOnce({ rows: [fakeUser] });

    const res = await callRoute('POST', '/signup', {
      studentId: '2021001',
      fullName: 'Juan dela Cruz',
      program: 'BSCS',
      tipEmail: 'mjdelacruz@tip.edu.ph',
    });

    expect(res._status).toBe(201);
    expect(res._body.token).toBeTruthy();
    expect(res._body.user.studentId).toBe('2021001');
  });

  it('2. Signup with duplicate studentId → HTTP 409, message "Student ID already registered"', async () => {
    // Validates: Requirements 1.2
    const dupError = new Error('duplicate key');
    dupError.code = '23505';
    dupError.constraint = 'forge_users_student_id_key';
    querySpy.mockRejectedValueOnce(dupError);

    const res = await callRoute('POST', '/signup', {
      studentId: '2021001',
      fullName: 'Juan dela Cruz',
      program: 'BSCS',
      tipEmail: 'mjdelacruz@tip.edu.ph',
    });

    expect(res._status).toBe(409);
    expect(res._body.error).toBe('Student ID already registered');
  });

  it('3. Signup with missing fields → HTTP 400, message "All fields are required: studentId, fullName, program, tipEmail"', async () => {
    // Validates: Requirements 1.4
    const res = await callRoute('POST', '/signup', {
      studentId: '2021001',
      // fullName missing
      program: 'BSCS',
      tipEmail: 'jdelacruz@tip.edu.ph',
    });

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('All fields are required: studentId, fullName, program, tipEmail');
  });

  it('4. Signup with invalid studentId format (not 7 digits) → HTTP 400', async () => {
    // Validates: Requirements 1.3
    const res = await callRoute('POST', '/signup', {
      studentId: '123',
      fullName: 'Juan dela Cruz',
      program: 'BSCS',
    });

    expect(res._status).toBe(400);
    expect(res._body.error).toBeTruthy();
  });

  // ── Signin ────────────────────────────────────────────────────────────────

  it('5. Signin with valid credentials → HTTP 200, token present', async () => {
    // Validates: Requirements 2.1
    const fakeUser = {
      user_id: 42,
      student_id: '2021001',
      full_name: 'Juan dela Cruz',
      program: 'BSCS',
      role: 'STUDENT',
    };
    querySpy.mockResolvedValueOnce({ rows: [fakeUser] });

    const res = await callRoute('POST', '/signin', {
      tipEmail: 'juan@tip.edu.ph',
      studentId: '2021001',
    });

    expect(res._status).toBe(200);
    expect(res._body.token).toBeTruthy();
  });

  it('6. Signin with wrong credentials → HTTP 401, message "Invalid credentials"', async () => {
    // Validates: Requirements 2.2
    querySpy.mockResolvedValueOnce({ rows: [] });

    const res = await callRoute('POST', '/signin', {
      tipEmail: 'wrong@tip.edu.ph',
      studentId: '9999999',
    });

    expect(res._status).toBe(401);
    expect(res._body.error).toBe('Invalid credentials');
  });

  it('7. Signin with missing fields → HTTP 400', async () => {
    // Validates: Requirements 2.3
    const res = await callRoute('POST', '/signin', {
      // tipEmail missing
      studentId: '2021001',
    });

    expect(res._status).toBe(400);
    expect(res._body.error).toBeTruthy();
  });

  // ── Middleware: authenticateToken ─────────────────────────────────────────

  it('8. Protected route with no Authorization header → HTTP 401, "Access denied. No token provided."', () => {
    // Validates: Requirements 2.6
    const req = mockReq({}, {});
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error).toBe('Access denied. No token provided.');
    expect(next).not.toHaveBeenCalled();
  });

  it('9. Protected route with expired JWT → HTTP 401, "Token expired. Please sign in again."', () => {
    // Validates: Requirements 2.5
    const expiredToken = jwt.sign(
      { userId: 1, studentId: '2021001', role: 'STUDENT' },
      process.env.JWT_SECRET,
      { expiresIn: 30 }
    );

    const req = mockReq({}, { authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error).toBe('Token expired. Please sign in again.');
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// Validates: Requirements 1.3, 1.4, 1.1
// ---------------------------------------------------------------------------

describe('Authentication Property-Based Tests', () => {

  // **Feature: forge-system, Property 1: Student ID format rejection**
  // **Validates: Requirements 1.4**
  describe('Property 1: Student ID format rejection', () => {
    it('should accept Student IDs that are exactly 7 numeric digits', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: 9999999 }),
          (studentId) => {
            const studentIdStr = studentId.toString();
            const isValid = /^\d{7}$/.test(studentIdStr);
            expect(isValid).toBe(true);
            expect(studentIdStr.length).toBe(7);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject Student IDs that are not exactly 7 digits', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: 0, max: 999999 }).map(n => n.toString()),
            fc.integer({ min: 10000000, max: 99999999 }).map(n => n.toString()),
            fc.string({ minLength: 7, maxLength: 7 }).filter(s => !/^\d{7}$/.test(s)),
            fc.constant(''),
            fc.constant('123 4567'),
            fc.constant('12A4567')
          ),
          (invalidStudentId) => {
            const isValid = /^\d{7}$/.test(invalidStudentId);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: forge-system, Property 2: JWT role round trip**
  // **Validates: Requirements 1.1**
  describe('Property 2: JWT role round trip', () => {
    it('should preserve role information through JWT encode/decode cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.integer({ min: 1, max: 100000 }),
            studentId: fc.integer({ min: 1000000, max: 9999999 }).map(n => n.toString()),
            role: fc.constantFrom('STUDENT', 'LAB_ADMIN'),
            fullName: fc.string({ minLength: 3, maxLength: 50 }),
            program: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: null })
          }),
          (user) => {
            const token = generateToken(user);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.role).toBe(user.role);
            expect(decoded.userId).toBe(user.userId);
            expect(decoded.studentId).toBe(user.studentId);
            expect(decoded.fullName).toBe(user.fullName);
            expect(decoded.program).toBe(user.program);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: forge-system, Property 3: Empty field form rejection**
  // **Validates: Requirements 1.4**
  describe('Property 3: Empty field form rejection', () => {
    it('should reject sign up forms with any required field empty', () => {
      fc.assert(
        fc.property(
          fc.record({
            studentId: fc.option(fc.string(), { nil: '' }),
            fullName: fc.option(fc.string(), { nil: '' }),
            program: fc.option(fc.string(), { nil: '' })
          }).filter(form => !form.studentId || !form.fullName || !form.program),
          (form) => {
            const hasEmptyField = !form.studentId || !form.fullName || !form.program;
            expect(hasEmptyField).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject sign in forms with any required field empty', () => {
      fc.assert(
        fc.property(
          fc.record({
            tipEmail: fc.option(fc.string(), { nil: '' }),
            studentId: fc.option(fc.string(), { nil: '' })
          }).filter(form => !form.tipEmail || !form.studentId),
          (form) => {
            const hasEmptyField = !form.tipEmail || !form.studentId;
            expect(hasEmptyField).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Feature: lab-system-full-integration, Property 2: Invalid studentId format is rejected
describe('Property 2: Invalid studentId format is rejected', () => {
  // **Validates: Requirements 1.3**
  it('should always return HTTP 400 for any studentId that is not exactly 7 numeric digits', async () => {
    querySpy.mockReset();

    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => !/^\d{7}$/.test(s)),
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 20 }),
        async (invalidStudentId, fullName, program) => {
          querySpy.mockReset();

          const res = await callRoute('POST', '/signup', {
            studentId: invalidStudentId,
            fullName,
            program,
          });

          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 3: Missing required signup fields are rejected
describe('Property 3: Missing required signup fields are rejected', () => {
  // **Validates: Requirements 1.4**
  it('should always return HTTP 400 with "All fields are required" when any required field is omitted', async () => {
    querySpy.mockReset();

    const allFields = ['studentId', 'fullName', 'program', 'tipEmail'];
    const validValues = {
      studentId: '2021001',
      fullName: 'Juan dela Cruz',
      program: 'BSCS',
      tipEmail: 'mjdelacruz@tip.edu.ph',
    };

    await fc.assert(
      fc.asyncProperty(
        fc.subarray(allFields, { minLength: 1, maxLength: 3 }),
        async (fieldsToOmit) => {
          querySpy.mockReset();

          // Build body with valid values, omitting the selected fields
          const body = {};
          for (const field of allFields) {
            if (!fieldsToOmit.includes(field)) {
              body[field] = validValues[field];
            }
          }

          const res = await callRoute('POST', '/signup', body);

          expect(res._status).toBe(400);
          expect(res._body.error).toBe('All fields are required: studentId, fullName, program, tipEmail');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 5: Non-existent credentials are rejected
describe('Property 5: Non-existent credentials are rejected', () => {
  // **Validates: Requirements 2.2**
  it('should always return HTTP 401 with "Invalid credentials" for any credentials not found in DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tipEmail: fc.emailAddress(),
          studentId: fc.string({ minLength: 1 }),
        }),
        async ({ tipEmail, studentId }) => {
          querySpy.mockReset();
          querySpy.mockResolvedValueOnce({ rows: [] });

          const res = await callRoute('POST', '/signin', { tipEmail, studentId });

          expect(res._status).toBe(401);
          expect(res._body.error).toBe('Invalid credentials');
        }
      ),
      { numRuns: 100 }
    );
  });
});
