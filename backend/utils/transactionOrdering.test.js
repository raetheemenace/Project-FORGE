// Feature: forge-system, Property 9: Transaction list ordering
// Validates: Requirements 9.1

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure helper — mirrors the ordering applied by GET /api/transactions
// Sorts transactions by txn_date DESC, then created_at DESC (tiebreaker).
// ---------------------------------------------------------------------------

/**
 * Sort a list of transaction objects the same way the endpoint does:
 * ORDER BY txn_date DESC, created_at DESC
 *
 * @param {Array<{txn_id: string, txn_date: string, created_at: string}>} txns
 * @returns {Array} new sorted array (does not mutate input)
 */
function sortTransactions(txns) {
  return [...txns].sort((a, b) => {
    const dateDiff = new Date(b.txn_date) - new Date(a.txn_date);
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/**
 * Returns true when the list is ordered by date descending
 * (each item's date >= the next item's date).
 */
function isOrderedDescending(txns) {
  for (let i = 0; i < txns.length - 1; i++) {
    const curr = new Date(txns[i].txn_date);
    const next = new Date(txns[i + 1].txn_date);
    if (curr < next) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** YYYY-MM-DD string in the range 2020-01-01 to 2030-12-31 */
const txnDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    const yyyy = String(year);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

/** ISO timestamp string for created_at */
const createdAtArb = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((ms) => new Date(ms).toISOString());

/** A single transaction object with the fields relevant to ordering */
const transactionArb = fc.record({
  txn_id: fc.string({ minLength: 3, maxLength: 20 }),
  txn_date: txnDateArb,
  created_at: createdAtArb,
  status: fc.constantFrom('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'),
});

/** A non-empty list of transactions (2–20 items) */
const transactionListArb = fc.array(transactionArb, { minLength: 2, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 9: Transaction list ordering
// Validates: Requirements 9.1
// ---------------------------------------------------------------------------
describe('Property 9: Transaction list ordering', () => {
  it('sorted list is always ordered by txn_date descending', () => {
    fc.assert(
      fc.property(transactionListArb, (txns) => {
        const sorted = sortTransactions(txns);
        expect(isOrderedDescending(sorted)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('sorting is idempotent: sorting an already-sorted list produces the same result', () => {
    fc.assert(
      fc.property(transactionListArb, (txns) => {
        const sorted = sortTransactions(txns);
        const sortedAgain = sortTransactions(sorted);
        expect(sortedAgain.map((t) => t.txn_id)).toEqual(sorted.map((t) => t.txn_id));
      }),
      { numRuns: 100 }
    );
  });

  it('sorting preserves all transactions (no items lost or duplicated)', () => {
    fc.assert(
      fc.property(transactionListArb, (txns) => {
        const sorted = sortTransactions(txns);
        expect(sorted).toHaveLength(txns.length);
        // Every original txn_id appears exactly once in the sorted result
        const originalIds = txns.map((t) => t.txn_id).sort();
        const sortedIds = sorted.map((t) => t.txn_id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 }
    );
  });

  it('a later txn_date always appears before an earlier txn_date after sorting', () => {
    fc.assert(
      fc.property(
        fc.record({
          laterDate: txnDateArb,
          earlierDate: txnDateArb,
        }).filter(({ laterDate, earlierDate }) => laterDate > earlierDate),
        ({ laterDate, earlierDate }) => {
          const txns = [
            { txn_id: 'A', txn_date: earlierDate, created_at: new Date().toISOString(), status: 'ACTIVE' },
            { txn_id: 'B', txn_date: laterDate, created_at: new Date().toISOString(), status: 'ACTIVE' },
          ];
          const sorted = sortTransactions(txns);
          expect(sorted[0].txn_id).toBe('B');
          expect(sorted[1].txn_id).toBe('A');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('single-element list is trivially ordered', () => {
    fc.assert(
      fc.property(transactionArb, (txn) => {
        const sorted = sortTransactions([txn]);
        expect(sorted).toHaveLength(1);
        expect(sorted[0].txn_id).toBe(txn.txn_id);
      }),
      { numRuns: 100 }
    );
  });
});
