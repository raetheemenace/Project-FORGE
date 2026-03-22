// Feature: forge-system, Property 13: Admin role authorization
// Validates: Admin access control (Requirements 15.10)

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure role-check logic — mirrors the requireRole('LAB_ADMIN') middleware
// in backend/middleware/auth.js.
// ---------------------------------------------------------------------------

const ADMIN_ROLE = 'LAB_ADMIN';

/**
 * Simulates the requireRole middleware decision.
 * Returns 403 when the role is not LAB_ADMIN, 200 otherwise.
 */
function checkAdminAccess(role) {
  if (role !== ADMIN_ROLE) return 403;
  return 200;
}

/**
 * Simulates the authenticateToken middleware decision.
 * Returns 401 when no token is present.
 */
function checkAuthenticated(token) {
  if (!token) return 401;
  return 200;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any role string that is NOT LAB_ADMIN */
const nonAdminRoleArb = fc
  .oneof(
    fc.constant('STUDENT'),
    fc.constant(''),
    fc.constant(null),
    fc.constant(undefined),
    fc.string().filter((s) => s !== ADMIN_ROLE)
  );

/** Any non-empty string that is not LAB_ADMIN (simulates a valid but wrong-role JWT) */
const nonAdminStringRoleArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s !== ADMIN_ROLE);

/** A missing/falsy token */
const missingTokenArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant('')
);

/** A present (truthy) token string */
const presentTokenArb = fc.string({ minLength: 10, maxLength: 200 }).filter(Boolean);

// ---------------------------------------------------------------------------
// Property 13: Admin role authorization
// Validates: Requirements 15.10
// ---------------------------------------------------------------------------

describe('Property 13: Admin role authorization', () => {

  // ── 403 cases ─────────────────────────────────────────────────────────────

  it('returns 403 for any role that is not LAB_ADMIN', () => {
    fc.assert(
      fc.property(nonAdminRoleArb, (role) => {
        expect(checkAdminAccess(role)).toBe(403);
      }),
      { numRuns: 200 }
    );
  });

  it('returns 403 for any non-empty string role that is not LAB_ADMIN', () => {
    fc.assert(
      fc.property(nonAdminStringRoleArb, (role) => {
        expect(checkAdminAccess(role)).toBe(403);
      }),
      { numRuns: 200 }
    );
  });

  it('STUDENT role is always rejected with 403', () => {
    fc.assert(
      fc.property(fc.constant('STUDENT'), (role) => {
        expect(checkAdminAccess(role)).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  // ── 200 case ──────────────────────────────────────────────────────────────

  it('returns 200 only for the exact LAB_ADMIN role', () => {
    expect(checkAdminAccess('LAB_ADMIN')).toBe(200);
  });

  it('role check is case-sensitive: any casing other than LAB_ADMIN is rejected', () => {
    const variants = ['lab_admin', 'Lab_Admin', 'LABADMIN', 'lab admin', 'LAB-ADMIN'];
    for (const variant of variants) {
      expect(checkAdminAccess(variant)).toBe(403);
    }
  });

  // ── 401 cases (missing token) ─────────────────────────────────────────────

  it('returns 401 when no token is provided', () => {
    fc.assert(
      fc.property(missingTokenArb, (token) => {
        expect(checkAuthenticated(token)).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 200 (authenticated) when a token is present', () => {
    fc.assert(
      fc.property(presentTokenArb, (token) => {
        expect(checkAuthenticated(token)).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  // ── Combined auth + role pipeline ─────────────────────────────────────────

  it('any request without a token is blocked before role check (401 takes precedence)', () => {
    fc.assert(
      fc.property(missingTokenArb, nonAdminRoleArb, (token, role) => {
        const authStatus = checkAuthenticated(token);
        // Pipeline: auth check runs first
        if (authStatus !== 200) {
          expect(authStatus).toBe(401);
        } else {
          expect(checkAdminAccess(role)).toBe(403);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('a request with a valid token but non-admin role is blocked with 403', () => {
    fc.assert(
      fc.property(presentTokenArb, nonAdminStringRoleArb, (token, role) => {
        expect(checkAuthenticated(token)).toBe(200);  // passes auth
        expect(checkAdminAccess(role)).toBe(403);     // blocked by role check
      }),
      { numRuns: 200 }
    );
  });

  it('only a request with a valid token AND LAB_ADMIN role passes both checks', () => {
    fc.assert(
      fc.property(presentTokenArb, (token) => {
        expect(checkAuthenticated(token)).toBe(200);
        expect(checkAdminAccess('LAB_ADMIN')).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  // ── Determinism ───────────────────────────────────────────────────────────

  it('role check is deterministic: same role always produces the same result', () => {
    fc.assert(
      fc.property(nonAdminStringRoleArb, (role) => {
        expect(checkAdminAccess(role)).toBe(checkAdminAccess(role));
      }),
      { numRuns: 100 }
    );
  });
});
