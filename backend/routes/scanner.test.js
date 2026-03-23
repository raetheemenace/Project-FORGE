// Scanner Routes - HTTP-level Unit Tests
// Validates: Requirements 3.3, 3.4, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRY = '24h';
process.env.AWS_REGION = 'us-east-1';

const require = createRequire(import.meta.url);

const mockSend = vi.fn();
const mockQuery = vi.fn();

const bedrockPath = require.resolve('@aws-sdk/client-bedrock-runtime');
const dbPath = require.resolve('../db/pool');

require.cache[bedrockPath] = {
  id: bedrockPath, filename: bedrockPath, loaded: true,
  exports: {
    BedrockRuntimeClient: function() { return { send: mockSend }; },
    InvokeModelCommand: function(i) { return i; },
  },
  parent: null, children: [], paths: [],
};

require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { query: mockQuery, initialize: vi.fn(), getConnection: vi.fn(), close: vi.fn(), getPoolStatistics: vi.fn() },
  parent: null, children: [], paths: [],
};

const scannerRouter = require('./scanner');

function makeToken(userId) {
  return jwt.sign(
    { userId, studentId: '2021001', role: 'STUDENT', fullName: 'Test User', program: 'BSCS' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function mockRes(resolve) {
  const res = { _status: 200, _body: null };
  res.status = function(c) { res._status = c; return res; };
  res.json = function(b) { res._body = b; resolve(); return res; };
  return res;
}

async function callIdentify(body, headers) {
  const req = { body: body || {}, headers: headers || {}, method: 'POST', path: '/identify', url: '/identify' };
  let res;
  await new Promise(function(resolve, reject) {
    res = mockRes(resolve);
    const layer = (scannerRouter.stack || []).find(function(l) { return l.route && l.route.path === '/identify'; });
    if (!layer) return reject(new Error('Route not found'));
    const handlers = layer.route.stack.map(function(s) { return s.handle; });
    let idx = 0;
    function next(err) {
      if (err) return reject(err);
      if (idx >= handlers.length) return resolve();
      const fn = handlers[idx++];
      try { Promise.resolve(fn(req, res, next)).catch(reject); } catch(e) { reject(e); }
    }
    next();
  });
  return res;
}

function bedrockResp(text) {
  return { body: new TextEncoder().encode(JSON.stringify({ content: [{ text: text }] })) };
}

describe('Scanner Routes - /api/scanner/identify', function() {
  beforeEach(function() {
    mockSend.mockReset();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('1. Valid base64 + mocked Bedrock JSON -> HTTP 200, all four fields present', async function() {
    mockSend.mockResolvedValueOnce(bedrockResp(JSON.stringify({ name: 'Microscope', condition: 'Good', confidence: 92, equipmentId: 'EQ-0001' })));
    mockQuery.mockResolvedValueOnce({ rows: [{ equipment_id: 'EQ-0001' }] }).mockResolvedValueOnce({ rows: [] });
    const res = await callIdentify({ imageBase64: 'dGVzdA==' }, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty('equipmentId');
    expect(res._body).toHaveProperty('name');
    expect(res._body).toHaveProperty('condition');
    expect(res._body).toHaveProperty('confidence');
    expect(res._body.name).toBe('Microscope');
    expect(res._body.condition).toBe('Good');
    expect(res._body.confidence).toBe(92);
  });

  it('2. Mocked Bedrock returns non-JSON -> HTTP 200, fallback values', async function() {
    mockSend.mockResolvedValueOnce(bedrockResp('not json'));
    const res = await callIdentify({ imageBase64: 'dGVzdA==' }, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(200);
    expect(res._body.name).toBe('Unknown Equipment');
    expect(res._body.condition).toBe('Fair');
    expect(res._body.confidence).toBe(0);
    expect(res._body.equipmentId).toBeNull();
  });

  it('3. Mocked Bedrock throws ThrottlingException -> HTTP 429', async function() {
    const err = Object.assign(new Error('throttled'), { name: 'ThrottlingException' });
    mockSend.mockRejectedValueOnce(err);
    const res = await callIdentify({ imageBase64: 'dGVzdA==' }, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(429);
    expect(res._body.error).toBe('Too many scan requests. Please wait 30 seconds and try again.');
  });

  it('4. Mocked Bedrock throws ValidationException -> HTTP 400', async function() {
    const err = Object.assign(new Error('invalid'), { name: 'ValidationException' });
    mockSend.mockRejectedValueOnce(err);
    const res = await callIdentify({ imageBase64: 'dGVzdA==' }, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Invalid image format. Please try a different image.');
  });

  it('5. Request without JWT -> HTTP 401', async function() {
    const res = await callIdentify({ imageBase64: 'dGVzdA==' }, {});
    expect(res._status).toBe(401);
  });

  it('6. Request without imageBase64 -> HTTP 400, "imageBase64 is required"', async function() {
    const res = await callIdentify({}, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('imageBase64 is required');
  });

  it('7. Successful scan -> INSERT into forge_scan_log with correct fields', async function() {
    mockSend.mockResolvedValueOnce(bedrockResp(JSON.stringify({ name: 'Bunsen Burner', condition: 'Excellent', confidence: 88, equipmentId: null })));
    const userId = 7;
    await callIdentify({ imageBase64: 'dGVzdA==' }, { authorization: 'Bearer ' + makeToken(userId) });
    const insertCall = mockQuery.mock.calls.find(function(c) { return c[0] && c[0].includes('INSERT INTO forge_scan_log'); });
    expect(insertCall).toBeDefined();
    const params = insertCall[1];
    expect(params[0]).toBe(userId);
    expect(params[3]).toBe('Bunsen Burner');
    expect(params[4]).toBe(88);
  });
});

// Feature: lab-system-full-integration, Property 7: Scanner response schema invariant
describe('Property 7: Scanner response schema invariant', function() {
  // Validates: Requirements 3.4, 5.8
  const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

  beforeEach(function() {
    mockSend.mockReset();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('condition is always one of Excellent/Good/Fair/Poor regardless of Bedrock output', async function() {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String(),
        fc.record({
          condition: fc.oneof(
            fc.constantFrom(...VALID_CONDITIONS),
            fc.string(),
            fc.constant(null),
            fc.constant(undefined),
            fc.integer()
          ),
          name: fc.string(),
          confidence: fc.integer({ min: 0, max: 100 }),
          equipmentId: fc.oneof(fc.constant(null), fc.string()),
        }),
        async function(imageBase64, arbitraryJson) {
          mockSend.mockResolvedValueOnce(bedrockResp(JSON.stringify(arbitraryJson)));
          mockQuery.mockResolvedValue({ rows: [] });

          const res = await callIdentify(
            { imageBase64: imageBase64 || 'dGVzdA==' },
            { authorization: 'Bearer ' + makeToken(1) }
          );

          expect(res._status).toBe(200);
          expect(VALID_CONDITIONS).toContain(res._body.condition);
        }
      ),
      { numRuns: 100 }
    );
  });
});