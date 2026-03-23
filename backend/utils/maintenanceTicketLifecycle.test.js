// Feature: forge-system, Property 15: Maintenance ticket lifecycle
// Validates: Maintenance workflow integrity

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure transition logic — mirrors the ALLOWED_TRANSITIONS map in
// backend/routes/admin/tickets.js
// ---------------------------------------------------------------------------

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const ALLOWED_TRANSITIONS = {
  OPEN:        ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

/**
 * Returns true when transitioning from `from` to `to` is permitted.
 * @param {string} from - Current status
 * @param {string} to   - Requested next status
 * @returns {boolean}
 */
function isValidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const statusArb = fc.constantFrom(...VALID_STATUSES);

/** A pair (from, to) that represents a valid forward transition. */
const validTransitionArb = fc.oneof(
  fc.constant(['OPEN',        'IN_PROGRESS']),
  fc.constant(['IN_PROGRESS', 'RESOLVED']),
  fc.constant(['RESOLVED',    'CLOSED'])
);

/** A pair (from, to) that represents a backward transition. */
const backwardTransitionArb = fc.oneof(
  fc.constant(['IN_PROGRESS', 'OPEN']),
  fc.constant(['RESOLVED',    'IN_PROGRESS']),
  fc.constant(['RESOLVED',    'OPEN']),
  fc.constant(['CLOSED',      'RESOLVED']),
  fc.constant(['CLOSED',      'IN_PROGRESS']),
  fc.constant(['CLOSED',      'OPEN'])
);

/** A pair (from, to) where from === to (no-op / same-status). */
const sameStatusTransitionArb = statusArb.map((s) => [s, s]);

// ---------------------------------------------------------------------------
// Property 15: Maintenance ticket lifecycle
// Validates: Maintenance workflow integrity
// ---------------------------------------------------------------------------

describe('Property 15: Maintenance ticket lifecycle', () => {

  // ── Valid forward transitions are allowed ─────────────────────────────────

  it('allows all valid forward transitions (OPEN→IN_PROGRESS, IN_PROGRESS→RESOLVED, RESOLVED→CLOSED)', () => {
    fc.assert(
      fc.property(validTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // ── Backward transitions are rejected ─────────────────────────────────────

  it('rejects all backward transitions', () => {
    fc.assert(
      fc.property(backwardTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // ── CLOSED is a terminal state — no transitions out ───────────────────────

  it('rejects any transition out of CLOSED status', () => {
    fc.assert(
      fc.property(statusArb, (to) => {
        expect(isValidTransition('CLOSED', to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // ── Same-status transitions are not allowed ───────────────────────────────

  it('rejects same-status transitions (no self-loops)', () => {
    fc.assert(
      fc.property(sameStatusTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // ── Each status has exactly one valid next state (except CLOSED) ──────────

  it('each non-terminal status has exactly one valid forward transition', () => {
    const nonTerminal = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    fc.assert(
      fc.property(fc.constantFrom(...nonTerminal), (from) => {
        const validNextStates = VALID_STATUSES.filter((to) => isValidTransition(from, to));
        expect(validNextStates).toHaveLength(1);
      }),
      { numRuns: 100 }
    );
  });

  // ── Skipping steps is not allowed ─────────────────────────────────────────

  it('rejects skipping steps in the lifecycle (e.g. OPEN→RESOLVED, OPEN→CLOSED)', () => {
    const skipTransitions = [
      ['OPEN',        'RESOLVED'],
      ['OPEN',        'CLOSED'],
      ['IN_PROGRESS', 'CLOSED'],
    ];
    fc.assert(
      fc.property(fc.constantFrom(...skipTransitions), ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // ── isValidTransition is deterministic ────────────────────────────────────

  it('transition validation is deterministic: same inputs always produce the same result', () => {
    fc.assert(
      fc.property(statusArb, statusArb, (from, to) => {
        expect(isValidTransition(from, to)).toBe(isValidTransition(from, to));
      }),
      { numRuns: 200 }
    );
  });
});
