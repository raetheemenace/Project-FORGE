// Transactions Routes - HTTP-level Unit Tests
// Validates: Requirements 6.1, 6.2
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRY = '24h';

const require = createRequire(import.meta.url);

// --- Mock db/pool via require.cache before loading the router ---
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockClientQuery = vi.fn();

const mockClient = {
  query: mockClientQuery,
  release: mockRelease,
};

const mockGetConnection = vi.fn();

const dbPath = require.resolve('../db/pool');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: mockQuery,
    getConnection: mockGetConnection,
    initialize: vi.fn(),
    close: vi.fn(),
    getPoolStatistics: vi.fn(),
  },
  parent: null, children: [], paths: [],
};

const txnIdPath = require.resolve('../utils/txnId');
require.cache[txnIdPath] = {
  id: txnIdPath, filename: txnIdPath, loaded: true,
  exports: {
    getNextTxnId: vi.fn().mockResolvedValue('TXN-20260101-001'),
    generateTxnId: vi.fn(),
  },
  parent: null, children: [], paths: [],
};

const transactionsRouter = require('./transactions');

// --- Helpers ---
function makeToken(userId = 1) {
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

async function callRoute(method, routePath, body, headers) {
  const req = {
    body: body || {},
    headers: headers || {},
    method: method.toUpperCase(),
    path: routePath,
    url: routePath,
  };
  let res;
  await new Promise(function(resolve, reject) {
    res = mockRes(resolve);
    const layer = (transactionsRouter.stack || []).find(function(l) {
      return l.route && l.route.path === '/' && l.route.methods[method.toLowerCase()];
    });
    if (!layer) return reject(new Error('Route not found: ' + method + ' ' + routePath));
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

const validBody = {
  department: 'CS',
  course: 'CS101',
  timeSlot: '8:00-10:00',
  date: '2026-01-01',
  labRoom: 'Lab A',
  adviser: 'Dr. Smith',
  items: [
    { equipmentId: 'EQ-001', name: 'Microscope', condition: 'Good' },
    { equipmentId: 'EQ-002', name: 'Bunsen Burner', condition: 'Excellent' },
  ],
};

describe('POST /api/transactions', function() {
  beforeEach(function() {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockGetConnection.mockReset();

    // Default: getConnection returns the mock client
    mockGetConnection.mockResolvedValue(mockClient);
    // BEGIN, INSERT header, INSERT items..., COMMIT all succeed
    mockClientQuery.mockResolvedValue({ rows: [{ count: '0' }] });
  });

  it('1. POST with valid body (N items) → 201, txnId present, inserts called correctly', async function() {
    const N = validBody.items.length;
    const res = await callRoute('post', '/', validBody, { authorization: 'Bearer ' + makeToken(1) });

    expect(res._status).toBe(201);
    expect(res._body).toHaveProperty('txnId');
    expect(res._body.txnId).toBe('TXN-20260101-001');

    // client.query calls: BEGIN, INSERT forge_transactions, N x INSERT forge_txn_items, COMMIT
    const calls = mockClientQuery.mock.calls;
    const beginCall = calls.find(c => c[0] === 'BEGIN');
    expect(beginCall).toBeDefined();

    const headerInsert = calls.find(c => typeof c[0] === 'string' && c[0].includes('INSERT INTO forge_transactions'));
    expect(headerInsert).toBeDefined();

    const itemInserts = calls.filter(c => typeof c[0] === 'string' && c[0].includes('INSERT INTO forge_txn_items'));
    expect(itemInserts).toHaveLength(N);

    const commitCall = calls.find(c => c[0] === 'COMMIT');
    expect(commitCall).toBeDefined();

    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('2. POST with missing session fields → 400, "All session fields are required."', async function() {
    const body = { ...validBody, department: undefined };
    const res = await callRoute('post', '/', body, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('All session fields are required.');
  });

  it('3. POST with empty items array → 400, "At least one equipment item is required."', async function() {
    const body = { ...validBody, items: [] };
    const res = await callRoute('post', '/', body, { authorization: 'Bearer ' + makeToken(1) });
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('At least one equipment item is required.');
  });

  it('4. POST without JWT → 401', async function() {
    const res = await callRoute('post', '/', validBody, {});
    expect(res._status).toBe(401);
  });
});

describe('GET /api/transactions', function() {
  beforeEach(function() {
    mockQuery.mockReset();
    mockGetConnection.mockReset();
  });

  it('5. GET → returns { transactions: [...] } for authenticated user, ordered by txn_date DESC', async function() {
    const fakeRows = [
      { txn_id: 'TXN-20260101-002', txn_date: '2026-01-02', items: [] },
      { txn_id: 'TXN-20260101-001', txn_date: '2026-01-01', items: [] },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeRows });

    const res = await callRoute('get', '/', {}, { authorization: 'Bearer ' + makeToken(1) });

    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty('transactions');
    expect(res._body.transactions).toEqual(fakeRows);

    // Verify the SQL query orders by txn_date DESC
    const sqlCall = mockQuery.mock.calls[0];
    expect(sqlCall[0]).toMatch(/ORDER BY.*txn_date DESC/i);
  });

  it('6. GET without JWT → 401', async function() {
    const res = await callRoute('get', '/', {}, {});
    expect(res._status).toBe(401);
  });
});

// Feature: lab-system-full-integration, Property 14: Transaction creation is atomic
import fc from 'fast-check';

describe('Property 14: Transaction creation is atomic', function() {
  beforeEach(function() {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockGetConnection.mockReset();

    mockGetConnection.mockResolvedValue(mockClient);
    mockClientQuery.mockResolvedValue({ rows: [{ count: '0' }] });
  });

  it('for any valid items array, inserts exactly 1 forge_transactions row and N forge_txn_items rows', async function() {
    // Validates: Requirements 6.1
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            equipmentId: fc.string({ minLength: 1 }), // Ensure non-empty
            condition: fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          mockClientQuery.mockReset();
          mockGetConnection.mockReset();
          mockRelease.mockReset();
          mockGetConnection.mockResolvedValue(mockClient);
          mockClientQuery.mockResolvedValue({ rows: [{ count: '0' }] });

          const body = {
            department: 'CS',
            course: 'CS101',
            timeSlot: '8:00-10:00',
            date: '2026-01-01',
            labRoom: 'Lab A',
            adviser: 'Dr. Smith',
            items,
          };

          const res = await callRoute('post', '/', body, { authorization: 'Bearer ' + makeToken(1) });

          expect(res._status).toBe(201);

          const calls = mockClientQuery.mock.calls;

          const headerInserts = calls.filter(
            (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO forge_transactions')
          );
          expect(headerInserts).toHaveLength(1);

          const itemInserts = calls.filter(
            (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO forge_txn_items')
          );
          expect(itemInserts).toHaveLength(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: lab-system-full-integration, Property 15: Transaction list is complete and ordered
describe('Property 15: Transaction list is complete and ordered', function() {
  beforeEach(function() {
    mockQuery.mockReset();
    mockGetConnection.mockReset();
  });

  it('response contains exactly N transactions in the same order as mocked rows', async function() {
    // Validates: Requirements 6.2
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            txn_id: fc.string(),
            txn_date: fc.string(),
            items: fc.constant([]),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (rows) => {
          mockQuery.mockReset();
          mockQuery.mockResolvedValueOnce({ rows });

          const res = await callRoute('get', '/', {}, { authorization: 'Bearer ' + makeToken(1) });

          expect(res._status).toBe(200);
          expect(res._body).toHaveProperty('transactions');
          expect(res._body.transactions).toHaveLength(rows.length);
          expect(res._body.transactions).toEqual(rows);
        }
      ),
      { numRuns: 100 }
    );
  });
});
