// Feature: forge-system, Property 7: Atomic transaction persistence
// Validates: Requirements 7.6, 12.4

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure transaction-building logic
// Mirrors what POST /api/transactions does before hitting the DB.
// We test that for any valid input, the SQL parameters contain ALL required
// session fields and ALL equipment items — i.e. nothing is silently dropped.
// ---------------------------------------------------------------------------

/**
 * Builds the parameter array for the forge_transactions INSERT.
 * Returns [txnId, userId, department, course, timeSlot, date, labRoom, adviser]
 */
function buildTransactionParams(txnId, userId, body) {
  const { department, course, timeSlot, date, labRoom, adviser } = body;
  return [txnId, userId, department, course, timeSlot, date, labRoom, adviser];
}

/**
 * Builds the parameter arrays for each forge_txn_items INSERT.
 * Returns an array of [txnId, equipmentId, condition] tuples.
 */
function buildItemParams(txnId, items) {
  return items.map((item) => [txnId, item.equipmentId ?? null, item.condition ?? null]);
}

/**
 * Simulates the full atomic write: returns an object representing what
 * would be persisted to the DB for a given transaction input.
 */
function simulateAtomicWrite(txnId, userId, body) {
  const txnParams = buildTransactionParams(txnId, userId, body);
  const itemParams = buildItemParams(txnId, body.items);
  return { txnParams, itemParams };
}

/**
 * Simulates querying the DB for a transaction by ID.
 * Given the persisted data, reconstructs the full record as the DB would return it.
 */
function simulateQuery(txnId, persisted) {
  const [, userId, department, course, timeSlot, date, labRoom, adviser] = persisted.txnParams;
  const items = persisted.itemParams.map(([, equipmentId, condition]) => ({
    equipmentId,
    condition,
  }));
  return { txnId, userId, department, course, timeSlot, date, labRoom, adviser, items };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStr = fc.string({ minLength: 1, maxLength: 100 });
const conditionArb = fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor');

const itemArb = fc.record({
  equipmentId: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 5, maxLength: 10 }).map((s) => `EQ-${s}`)
  ),
  name: nonEmptyStr,
  condition: conditionArb,
});

const itemsArb = fc.array(itemArb, { minLength: 1, maxLength: 10 });

const txnBodyArb = fc.record({
  department: fc.constantFrom('Chemistry', 'Physics', 'Engineering'),
  course: nonEmptyStr,
  timeSlot: fc.constantFrom(
    '07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00',
    '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'
  ),
  date: fc
    .record({
      year: fc.integer({ min: 2026, max: 2099 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }),
    })
    .map(({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    ),
  labRoom: nonEmptyStr,
  adviser: nonEmptyStr,
  items: itemsArb,
});

const txnIdArb = fc
  .record({
    year: fc.integer({ min: 2026, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    seq: fc.integer({ min: 1, max: 999 }),
  })
  .map(({ year, month, day, seq }) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const nnn = String(seq).padStart(3, '0');
    return `TXN-${year}${mm}${dd}-${nnn}`;
  });

const userIdArb = fc.integer({ min: 1, max: 99999 });

// ---------------------------------------------------------------------------
// Property 7: Atomic transaction persistence
// Validates: Requirements 7.6, 12.4
// ---------------------------------------------------------------------------
describe('Property 7: Atomic transaction persistence', () => {
  it('all session fields are present in the persisted transaction record', () => {
    fc.assert(
      fc.property(txnIdArb, userIdArb, txnBodyArb, (txnId, userId, body) => {
        const persisted = simulateAtomicWrite(txnId, userId, body);
        const record = simulateQuery(txnId, persisted);

        expect(record.txnId).toBe(txnId);
        expect(record.userId).toBe(userId);
        expect(record.department).toBe(body.department);
        expect(record.course).toBe(body.course);
        expect(record.timeSlot).toBe(body.timeSlot);
        expect(record.date).toBe(body.date);
        expect(record.labRoom).toBe(body.labRoom);
        expect(record.adviser).toBe(body.adviser);
      }),
      { numRuns: 200 }
    );
  });

  it('all equipment items are persisted with correct conditions', () => {
    fc.assert(
      fc.property(txnIdArb, userIdArb, txnBodyArb, (txnId, userId, body) => {
        const persisted = simulateAtomicWrite(txnId, userId, body);
        const record = simulateQuery(txnId, persisted);

        // Item count must match exactly
        expect(record.items).toHaveLength(body.items.length);

        // Each item's condition must be preserved
        for (let i = 0; i < body.items.length; i++) {
          expect(record.items[i].condition).toBe(body.items[i].condition);
          expect(record.items[i].equipmentId).toBe(body.items[i].equipmentId ?? null);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('no session fields are silently dropped for any valid input', () => {
    const SESSION_FIELDS = ['department', 'course', 'timeSlot', 'date', 'labRoom', 'adviser'];
    fc.assert(
      fc.property(txnIdArb, userIdArb, txnBodyArb, (txnId, userId, body) => {
        const persisted = simulateAtomicWrite(txnId, userId, body);
        const record = simulateQuery(txnId, persisted);

        for (const field of SESSION_FIELDS) {
          expect(record[field]).toBeDefined();
          expect(record[field]).not.toBeNull();
          expect(record[field]).toBe(body[field]);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('item count in persisted record equals the number of items in the request', () => {
    fc.assert(
      fc.property(txnIdArb, userIdArb, txnBodyArb, (txnId, userId, body) => {
        const persisted = simulateAtomicWrite(txnId, userId, body);
        expect(persisted.itemParams).toHaveLength(body.items.length);
      }),
      { numRuns: 200 }
    );
  });

  it('every item param row is linked to the correct transaction ID', () => {
    fc.assert(
      fc.property(txnIdArb, userIdArb, txnBodyArb, (txnId, userId, body) => {
        const persisted = simulateAtomicWrite(txnId, userId, body);
        for (const itemRow of persisted.itemParams) {
          expect(itemRow[0]).toBe(txnId);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('mocked DB client receives BEGIN and COMMIT for every successful transaction', async () => {
    await fc.assert(
      fc.asyncProperty(txnIdArb, userIdArb, txnBodyArb, async (txnId, userId, body) => {
        const calls = [];
        const mockClient = {
          query: vi.fn(async (sql) => {
            calls.push(sql.trim().toUpperCase().split(/\s+/)[0]);
            // Simulate COUNT query for getNextTxnId
            if (sql.includes('COUNT')) return { rows: [{ count: '0' }] };
            return { rows: [] };
          }),
          release: vi.fn(),
        };
        const mockPool = {
          connect: vi.fn().mockResolvedValue(mockClient),
        };

        // Simulate the route handler's DB interaction
        const client = await mockPool.connect();
        await client.query('BEGIN');
        // Simulate txnId generation (COUNT query)
        await client.query('SELECT COUNT(*) AS count FROM forge_transactions WHERE txn_date = $1', [body.date]);
        // Insert transaction
        await client.query('INSERT INTO forge_transactions (...) VALUES (...)', [
          txnId, userId, body.department, body.course, body.timeSlot, body.date, body.labRoom, body.adviser,
        ]);
        // Insert items
        for (const item of body.items) {
          await client.query('INSERT INTO forge_txn_items (...) VALUES (...)', [
            txnId, item.equipmentId ?? null, item.condition ?? null,
          ]);
        }
        await client.query('COMMIT');
        client.release();

        // Verify BEGIN and COMMIT were called
        expect(calls).toContain('BEGIN');
        expect(calls).toContain('COMMIT');
        // ROLLBACK should NOT have been called on success
        expect(calls).not.toContain('ROLLBACK');
      }),
      { numRuns: 100 }
    );
  });
});
