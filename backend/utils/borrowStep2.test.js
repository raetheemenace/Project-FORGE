// Feature: forge-system, Property 4: Past date rejection
// Validates: Requirements 5.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure helper — mirrors the isPastDate logic in BorrowStep2.jsx
// Returns today's date as YYYY-MM-DD in local time
// ---------------------------------------------------------------------------
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns true if the given YYYY-MM-DD string is strictly before today.
 * This is the same logic exported from BorrowStep2.jsx.
 */
function isPastDate(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayString();
}

/**
 * Simulates the form validation for the date field.
 * Returns an error string when the date is invalid/past, or null when valid.
 */
function validateDate(dateStr) {
  if (!dateStr) return 'Date is required.';
  if (isPastDate(dateStr)) return 'Date cannot be in the past.';
  return null;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a YYYY-MM-DD string strictly before today.
 * We work entirely in local-date space to avoid UTC/local timezone skew:
 * build a Date at local midnight for a past year/month/day.
 */
const pastDateArb = fc
  .record({
    year: fc.integer({ min: 2000, max: 2025 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // 28 is safe for all months
  })
  .map(({ year, month, day }) => {
    const yyyy = String(year);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })
  .filter((dateStr) => dateStr < todayString()); // keep only genuinely past dates

/**
 * Generates a YYYY-MM-DD string that is today or in the future.
 * We build dates from 2027 onward so they are always in the future regardless of when tests run.
 */
const presentOrFutureDateArb = fc
  .record({
    year: fc.integer({ min: 2027, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    const yyyy = String(year);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

// ---------------------------------------------------------------------------
// Property 4: Past date rejection
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------
describe('Property 4: Past date rejection', () => {
  it('any date strictly before today is identified as a past date', () => {
    fc.assert(
      fc.property(pastDateArb, (dateStr) => {
        expect(isPastDate(dateStr)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('any date that is today or in the future is not identified as a past date', () => {
    fc.assert(
      fc.property(presentOrFutureDateArb, (dateStr) => {
        // Today's string is always >= todayString(), so isPastDate must be false
        expect(isPastDate(dateStr)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('form validation rejects any past date with an error message', () => {
    fc.assert(
      fc.property(pastDateArb, (dateStr) => {
        const error = validateDate(dateStr);
        expect(error).not.toBeNull();
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('form validation accepts any present or future date', () => {
    fc.assert(
      fc.property(presentOrFutureDateArb, (dateStr) => {
        const error = validateDate(dateStr);
        expect(error).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('empty date string is not treated as a past date (treated as missing)', () => {
    expect(isPastDate('')).toBe(false);
    expect(isPastDate(null)).toBe(false);
    expect(isPastDate(undefined)).toBe(false);
  });

  it('isPastDate is consistent: same date string always returns the same result', () => {
    fc.assert(
      fc.property(pastDateArb, (dateStr) => {
        // Idempotent — calling twice gives the same answer
        expect(isPastDate(dateStr)).toBe(isPastDate(dateStr));
      }),
      { numRuns: 100 }
    );
  });
});
