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


// Feature: lab-system-full-integration, Property 9: Successful scan is logged to forge_scan_log
describe('Property 9: Successful scan is logged to forge_scan_log', function() {
  // Validates: Requirements 3.6, 5.5, 6.9

  beforeEach(function() {
    mockSend.mockReset();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('forge_scan_log INSERT is called exactly once with matching user_id, predicted_name, confidence_score', async function() {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.record({
          name: fc.string(),
          confidence: fc.integer({ min: 0, max: 100 }),
          condition: fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor'),
          equipmentId: fc.constant(null),
        }),
        async function(userId, bedrockData) {
          mockSend.mockReset();
          mockQuery.mockReset();
          mockQuery.mockResolvedValue({ rows: [] });

          mockSend.mockResolvedValueOnce(bedrockResp(JSON.stringify(bedrockData)));

          await callIdentify(
            { imageBase64: 'dGVzdA==' },
            { authorization: 'Bearer ' + makeToken(userId) }
          );

          const insertCalls = mockQuery.mock.calls.filter(function(c) {
            return c[0] && c[0].includes('INSERT INTO forge_scan_log');
          });

          expect(insertCalls).toHaveLength(1);

          const params = insertCalls[0][1];
          expect(params[0]).toBe(userId);
          expect(params[3]).toBe(bedrockData.name);
          expect(params[4]).toBe(bedrockData.confidence);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================
// Bug Condition Exploration Tests — Property 1
// Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3
// EXPECTED TO FAIL on unfixed code — failure confirms the bug exists
// ============================================================
describe('Bug Condition Exploration — Catalog-Injected Prompt Resolves Valid Equipment ID', function() {
  // Validates: Requirements 2.1, 2.2, 2.3

  beforeEach(function() {
    mockSend.mockReset();
    mockQuery.mockReset();
    // Default: catalog query returns empty, log insert succeeds
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('BC-1: Bedrock returns null equipmentId with name "Bunsen Burner" — should resolve to EQ-5016 via name fallback', async function() {
    // Bedrock returns no ID but a valid name
    mockSend.mockResolvedValueOnce(
      bedrockResp(JSON.stringify({ name: 'Bunsen Burner', condition: 'Good', confidence: 85, equipmentId: null }))
    );

    // DB: catalog query (AVAILABLE equipment), direct-ID lookup (skipped since null), name-fallback lookup, scan log insert
    mockQuery
      .mockResolvedValueOnce({ rows: [{ equipment_id: 'EQ-5016', name: 'Bunsen Burner', status: 'AVAILABLE' }] }) // catalog fetch
      .mockResolvedValueOnce({ rows: [{ equipment_id: 'EQ-5016' }] })  // name-fallback
      .mockResolvedValueOnce({ rows: [] });                              // scan log insert

    const res = await callIdentify(
      { imageBase64: 'dGVzdA==' },
      { authorization: 'Bearer ' + makeToken(1) }
    );

    expect(res._status).toBe(200);
    // WILL FAIL on unfixed code: no name-fallback exists, so equipmentId is null
    expect(res._body.equipmentId).toBe('EQ-5016');
  });

  it('BC-2: Bedrock returns wrong ID "EQ-9999" with name "Vernier Caliper Mitutoyo 500-196" — should resolve to EQ-3001 via name fallback', async function() {
    // Bedrock returns a non-existent ID but a valid name
    mockSend.mockResolvedValueOnce(
      bedrockResp(JSON.stringify({ name: 'Vernier Caliper Mitutoyo 500-196', condition: 'Excellent', confidence: 90, equipmentId: 'EQ-9999' }))
    );

    // DB calls on FIXED code: catalog fetch, direct-ID lookup for EQ-9999 (not found), name-fallback returns EQ-3001, scan log insert
    // DB calls on UNFIXED code: direct-ID lookup for EQ-9999 (not found), scan log insert
    // We set up mocks for the fixed path; on unfixed code the first mock (catalog) is consumed by the direct-ID lookup,
    // returning a row with equipment_id 'EQ-3001' — but that row's equipment_id key is what the unfixed code reads,
    // so we must ensure the direct-ID lookup returns empty to prove the bug.
    // Use a query interceptor to route mocks correctly regardless of call order:
    mockQuery.mockImplementation(function(sql) {
      if (sql && sql.includes('WHERE status') && sql.includes('AVAILABLE') && !sql.includes('LOWER')) {
        // catalog fetch (fixed code only)
        return Promise.resolve({ rows: [{ equipment_id: 'EQ-3001', name: 'Vernier Caliper Mitutoyo 500-196', status: 'AVAILABLE' }] });
      }
      if (sql && sql.includes('WHERE equipment_id')) {
        // direct-ID lookup — EQ-9999 does not exist
        return Promise.resolve({ rows: [] });
      }
      if (sql && sql.includes('LOWER')) {
        // name-fallback (fixed code only)
        return Promise.resolve({ rows: [{ equipment_id: 'EQ-3001' }] });
      }
      // scan log insert and anything else
      return Promise.resolve({ rows: [] });
    });

    const res = await callIdentify(
      { imageBase64: 'dGVzdA==' },
      { authorization: 'Bearer ' + makeToken(1) }
    );

    expect(res._status).toBe(200);
    // WILL FAIL on unfixed code: wrong ID not found, no name-fallback, so equipmentId is null
    expect(res._body.equipmentId).toBe('EQ-3001');
  });

  it('BC-3: Bedrock returns null equipmentId with lowercase name "bunsen burner" — should resolve to EQ-5016 via case-insensitive name fallback', async function() {
    // Bedrock returns lowercase name — requires case-insensitive matching
    mockSend.mockResolvedValueOnce(
      bedrockResp(JSON.stringify({ name: 'bunsen burner', condition: 'Fair', confidence: 70, equipmentId: null }))
    );

    // DB: catalog fetch, name-fallback (case-insensitive), scan log insert
    mockQuery
      .mockResolvedValueOnce({ rows: [{ equipment_id: 'EQ-5016', name: 'Bunsen Burner', status: 'AVAILABLE' }] }) // catalog fetch
      .mockResolvedValueOnce({ rows: [{ equipment_id: 'EQ-5016' }] })  // case-insensitive name-fallback
      .mockResolvedValueOnce({ rows: [] });                              // scan log insert

    const res = await callIdentify(
      { imageBase64: 'dGVzdA==' },
      { authorization: 'Bearer ' + makeToken(1) }
    );

    expect(res._status).toBe(200);
    // WILL FAIL on unfixed code: no case-insensitive name-fallback exists
    expect(res._body.equipmentId).toBe('EQ-5016');
  });

  it('BC-4: Prompt sent to Bedrock must contain at least one EQ-XXXX catalog entry', async function() {
    // Set up catalog in DB
    mockQuery
      .mockResolvedValueOnce({ rows: [
        { equipment_id: 'EQ-1001', name: 'Oscilloscope Tektronix TDS2024C', status: 'AVAILABLE' },
        { equipment_id: 'EQ-5016', name: 'Bunsen Burner', status: 'AVAILABLE' },
      ]}) // catalog fetch
      .mockResolvedValueOnce({ rows: [] })  // direct-ID lookup
      .mockResolvedValueOnce({ rows: [] }); // scan log insert

    let capturedInput = null;
    mockSend.mockImplementationOnce(function(cmd) {
      capturedInput = cmd;
      return Promise.resolve(
        bedrockResp(JSON.stringify({ name: 'Bunsen Burner', condition: 'Good', confidence: 80, equipmentId: null }))
      );
    });

    await callIdentify(
      { imageBase64: 'dGVzdA==' },
      { authorization: 'Bearer ' + makeToken(1) }
    );

    // Extract the prompt text from the Bedrock input
    const body = JSON.parse(capturedInput.body);
    const promptText = body.messages[0].content
      .filter(function(c) { return c.type === 'text'; })
      .map(function(c) { return c.text; })
      .join('\n');

    // WILL FAIL on unfixed code: prompt has no catalog, so no EQ-XXXX entries
    expect(promptText).toMatch(/EQ-\d{4}/);
  });
});


// ============================================================
// Preservation Properties — Non-Buggy Inputs
// Validates: Requirements 3.1, 3.2, 3.4, 3.5
// EXPECTED TO PASS on unfixed code — confirms baseline behavior to preserve
// ============================================================
describe('Preservation Properties — Non-Buggy Inputs', function() {

  beforeEach(function() {
    mockSend.mockReset();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  // Property 2a: Throttle preservation
  // Validates: Requirement 3.2
  it('P2a: For any ThrottlingException, response is always HTTP 429 with the throttle message', async function() {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String(),
        async function(imageBase64) {
          mockSend.mockReset();
          mockQuery.mockReset();
          mockQuery.mockResolvedValue({ rows: [] });

          const err = Object.assign(new Error('throttled'), { name: 'ThrottlingException' });
          mockSend.mockRejectedValueOnce(err);

          const res = await callIdentify(
            { imageBase64: imageBase64 || 'dGVzdA==' },
            { authorization: 'Bearer ' + makeToken(1) }
          );

          expect(res._status).toBe(429);
          expect(res._body.error).toBe('Too many scan requests. Please wait 30 seconds and try again.');
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 2b: Non-JSON preservation
  // Validates: Requirement 3.1
  it('P2b: For any non-JSON Bedrock text, response always has name "Unknown Equipment" and equipmentId null', async function() {
    // Generate strings that throw on JSON.parse (not parseable at all)
    const nonJsonArb = fc.oneof(
      fc.string().filter(function(s) { try { JSON.parse(s); return false; } catch { return true; } }),
      fc.constantFrom('not json', 'hello world', 'undefined', '<xml/>', '{ broken json')
    );

    await fc.assert(
      fc.asyncProperty(
        nonJsonArb,
        async function(nonJsonText) {
          mockSend.mockReset();
          mockQuery.mockReset();
          mockQuery.mockResolvedValue({ rows: [] });

          mockSend.mockResolvedValueOnce(bedrockResp(nonJsonText));

          const res = await callIdentify(
            { imageBase64: 'dGVzdA==' },
            { authorization: 'Bearer ' + makeToken(1) }
          );

          expect(res._status).toBe(200);
          expect(res._body.name).toBe('Unknown Equipment');
          expect(res._body.equipmentId).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });
});
