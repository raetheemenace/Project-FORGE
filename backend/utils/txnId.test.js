// Feature: forge-system, Property 5: Transaction ID format invariant
// Feature: forge-system, Property 6: Transaction ID uniqueness

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { generateTxnId, getNextTxnId } from './txnId.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid date arbitrary: years 2020-2099, any month/day (NaN dates excluded) */
const validDateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2099-12-31'),
}).filter((d) => !isNaN(d.getTime()));

/** Valid sequence number: 1-999 */
const validSeqArb = fc.integer({ min: 1, max: 999 });

// ---------------------------------------------------------------------------
// Property 5: Transaction ID format invariant
// Validates: Requirements 12.3
// ---------------------------------------------------------------------------
describe('Property 5: Transaction ID format invariant', () => {
  it('generateTxnId always produces a string matching TXN-YYYYMMDD-NNN', () => {
    fc.assert(
      fc.property(validDateArb, validSeqArb, (date, seq) => {
        const id = generateTxnId(date, seq);
        expect(id).toMatch(/^TXN-\d{8}-\d{3}$/);
      })
    );
  });

  it('date portion in the ID matches the input date', () => {
    fc.assert(
      fc.property(validDateArb, validSeqArb, (date, seq) => {
        const id = generateTxnId(date, seq);
        const yyyy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const expectedDatePart = `${yyyy}${mm}${dd}`;
        expect(id).toContain(`TXN-${expectedDatePart}-`);
      })
    );
  });

  it('sequence portion is always zero-padded to 3 digits', () => {
    fc.assert(
      fc.property(validDateArb, validSeqArb, (date, seq) => {
        const id = generateTxnId(date, seq);
        const seqPart = id.split('-')[2];
        expect(seqPart).toHaveLength(3);
        expect(Number(seqPart)).toBe(seq);
      })
    );
  });

  it('getNextTxnId returns an ID matching TXN-YYYYMMDD-NNN (mocked pool)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDateArb,
        fc.integer({ min: 0, max: 998 }),
        async (date, existingCount) => {
          const mockPool = {
            query: vi.fn().mockResolvedValue({ rows: [{ count: String(existingCount) }] }),
          };
          const id = await getNextTxnId(mockPool, date);
          expect(id).toMatch(/^TXN-\d{8}-\d{3}$/);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Transaction ID uniqueness
// Validates: Requirements 12.3
// ---------------------------------------------------------------------------
describe('Property 6: Transaction ID uniqueness', () => {
  it('two different sequence numbers on the same date produce different IDs', () => {
    fc.assert(
      fc.property(
        validDateArb,
        fc.integer({ min: 1, max: 998 }),
        (date, seq1) => {
          const seq2 = seq1 + 1; // guaranteed different
          const id1 = generateTxnId(date, seq1);
          const id2 = generateTxnId(date, seq2);
          expect(id1).not.toBe(id2);
        }
      )
    );
  });

  it('same sequence number on two different dates produces different IDs', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2099-12-30') }),
        validSeqArb,
        (date1, seq) => {
          // date2 is always one day after date1
          const date2 = new Date(date1);
          date2.setDate(date2.getDate() + 1);
          const id1 = generateTxnId(date1, seq);
          const id2 = generateTxnId(date2, seq);
          expect(id1).not.toBe(id2);
        }
      )
    );
  });

  it('any two (date, seq) pairs that differ produce different IDs', () => {
    fc.assert(
      fc.property(
        fc.tuple(validDateArb, validSeqArb),
        fc.tuple(validDateArb, validSeqArb),
        ([date1, seq1], [date2, seq2]) => {
          const id1 = generateTxnId(date1, seq1);
          const id2 = generateTxnId(date2, seq2);
          // IDs must be equal iff both date and seq are the same
          const sameDate =
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
          const sameSeq = seq1 === seq2;
          if (sameDate && sameSeq) {
            expect(id1).toBe(id2);
          } else {
            expect(id1).not.toBe(id2);
          }
        }
      )
    );
  });
});
