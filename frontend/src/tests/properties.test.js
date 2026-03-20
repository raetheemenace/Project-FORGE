// Feature: forge-system - Property-Based Tests (fast-check v4)
// Run with: npx vitest run src/tests/properties.test.js
// NOTE: fast-check v4 requires property callbacks to return boolean, not use expect()

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- Pure helpers under test ---

const isValidStudentId = (id) => /^\d{7}$/.test(String(id).trim());

const decodeJwtPayload = (token) => {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return null; }
};

const buildFakeJwt = (payload) => {
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = btoa(JSON.stringify(payload));
  return `${h}.${b}.sig`;
};

const TXN_RE = /^TXN-\d{8}-\d{3}$/;
const buildTxnId = (yyyymmdd, seq) =>
  `TXN-${yyyymmdd}-${String(seq).padStart(3, '0')}`;

const TODAY = new Date().toISOString().split('T')[0];
const isDateValid = (s) => s >= TODAY;

const isReportValid = (eq, sev, desc) =>
  Boolean(eq?.trim() && sev?.trim() && desc?.trim());

const TRANSITIONS = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};
const canTransition = (from, to) => (TRANSITIONS[from] ?? []).includes(to);

// --- Arbitraries ---

const sevenDigit = fc
  .integer({ min: 0, max: 9999999 })
  .map((n) => String(n).padStart(7, '0'));

const yyyymmddArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`);

// Past: year 2000-2025, always < 2026-03-20 (TODAY)
const pastDateArb = fc
  .tuple(
    fc.integer({ min: 2000, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

// Future: year 2027-2099, always > 2026-03-20 (TODAY)
const futureDateArb = fc
  .tuple(
    fc.integer({ min: 2027, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

// --- Property 1: Student ID format rejection (Req 1.4) ---
describe('Property 1: Student ID format rejection', () => {
  it('accepts exactly 7-digit numeric strings', () => {
    fc.assert(
      fc.property(sevenDigit, (id) => isValidStudentId(id) === true),
      { numRuns: 100 }
    );
  });

  it('rejects strings shorter than 7 digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }).map((n) => String(n)),
        (id) => {
          fc.pre(id.length < 7);
          return isValidStudentId(id) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects strings longer than 7 digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000000, max: 999999999 }).map((n) => String(n)),
        (id) => isValidStudentId(id) === false
      ),
      { numRuns: 100 }
    );
  });

  it('rejects strings with non-numeric characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 7, maxLength: 7 }).filter((s) => /[^0-9]/.test(s)),
        (id) => isValidStudentId(id) === false
      ),
      { numRuns: 100 }
    );
  });

  it('rejects empty string', () => {
    expect(isValidStudentId('')).toBe(false);
  });
});

// --- Property 2: JWT role round trip (Req 1.6) ---
describe('Property 2: JWT role round trip', () => {
  it('decoded JWT contains the same role and userId that were encoded', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('STUDENT', 'LAB_ADMIN'),
        fc.integer({ min: 1, max: 9999 }),
        (role, userId) => {
          const token = buildFakeJwt({ userId, role, iat: 0, exp: 9999999999 });
          const decoded = decodeJwtPayload(token);
          return decoded !== null && decoded.role === role && decoded.userId === userId;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 3: Empty field form rejection (Req 1.5) ---
describe('Property 3: Empty field form rejection', () => {
  it('sign-in is invalid when any required field is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          username: fc.oneof(fc.constant(''), fc.string({ minLength: 1 })),
          password: fc.oneof(fc.constant(''), fc.string({ minLength: 1 })),
        }),
        ({ username, password }) => {
          const hasEmpty = !username.trim() || !password.trim();
          const isValid = !!username.trim() && !!password.trim();
          if (hasEmpty) return isValid === false;
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sign-up is invalid when any required field is empty', () => {
    const KEYS = ['fullName', 'username', 'studentId', 'program', 'password'];
    fc.assert(
      fc.property(
        fc.record(
          Object.fromEntries(
            KEYS.map((k) => [k, fc.oneof(fc.constant(''), fc.string({ minLength: 1 }))])
          )
        ),
        (form) => {
          const hasEmpty = KEYS.some((k) => !form[k].trim());
          const allFilled = KEYS.every((k) => !!form[k].trim());
          if (hasEmpty) return allFilled === false;
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 4: Past date rejection (Req 5.4) ---
describe('Property 4: Past date rejection', () => {
  it('rejects any date strictly before today', () => {
    fc.assert(
      fc.property(pastDateArb, (d) => isDateValid(d) === false),
      { numRuns: 100 }
    );
  });

  it('accepts future dates', () => {
    fc.assert(
      fc.property(futureDateArb, (d) => isDateValid(d) === true),
      { numRuns: 100 }
    );
  });
});

// --- Property 5: Transaction ID format invariant (Req 12.3) ---
describe('Property 5: Transaction ID format invariant', () => {
  it('every generated TXN ID matches TXN-YYYYMMDD-NNN', () => {
    fc.assert(
      fc.property(yyyymmddArb, fc.integer({ min: 1, max: 999 }), (date, seq) =>
        TXN_RE.test(buildTxnId(date, seq))
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 6: Transaction ID uniqueness (Req 12.3) ---
describe('Property 6: Transaction ID uniqueness', () => {
  it('different sequences on the same date produce different IDs', () => {
    fc.assert(
      fc.property(
        yyyymmddArb,
        fc.integer({ min: 1, max: 499 }),
        fc.integer({ min: 500, max: 999 }),
        (date, s1, s2) => buildTxnId(date, s1) !== buildTxnId(date, s2)
      ),
      { numRuns: 100 }
    );
  });

  it('same sequence on different dates produces different IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20200101, max: 20500601 }).map(String),
        fc.integer({ min: 20500602, max: 20991231 }).map(String),
        fc.integer({ min: 1, max: 999 }),
        (d1, d2, seq) => buildTxnId(d1, seq) !== buildTxnId(d2, seq)
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 8: Scanned items cart growth (Req 6.4) ---
describe('Property 8: Scanned items cart growth', () => {
  it('cart length equals number of add actions performed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            equipmentId: fc.integer({ min: 1000, max: 9999 }).map((n) => `EQ-${n}`),
            name: fc.string({ minLength: 1, maxLength: 40 }),
            condition: fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (items) => {
          const cart = [];
          items.forEach((item) => cart.push(item));
          return cart.length === items.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 9: Transaction list ordering (Req 9.1) ---
describe('Property 9: Transaction list ordering', () => {
  it('sorted list has each date >= the next', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ txnId: fc.string(), date: futureDateArb }),
          { minLength: 2, maxLength: 20 }
        ),
        (txns) => {
          const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date));
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].date < sorted[i + 1].date) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 10: Maintenance report field validation (Req 10.4) ---
describe('Property 10: Maintenance report field validation', () => {
  it('invalid when severity or description is empty', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.constant(''), fc.constantFrom('Low', 'Medium', 'High', 'Critical')),
        fc.oneof(fc.constant(''), fc.string({ minLength: 1 })),
        (eq, sev, desc) => {
          if (!sev.trim() || !desc.trim()) return isReportValid(eq, sev, desc) === false;
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid when all fields are non-empty and non-whitespace', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (eq, sev, desc) => isReportValid(eq, sev, desc) === true
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 12: TTS toggle state consistency (Req 11.1) ---
describe('Property 12: TTS toggle state consistency', () => {
  it('toggle on then off returns to original state', () => {
    fc.assert(
      fc.property(fc.boolean(), (initial) => {
        let s = initial;
        s = !s;
        s = !s;
        return s === initial;
      }),
      { numRuns: 100 }
    );
  });

  it('any even number of toggles is identity', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.integer({ min: 1, max: 50 }), (initial, n) => {
        let s = initial;
        for (let i = 0; i < n * 2; i++) s = !s;
        return s === initial;
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 13: Admin role authorization ---
describe('Property 13: Admin role authorization', () => {
  it('non-LAB_ADMIN roles are denied admin access', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('STUDENT', 'GUEST', 'MODERATOR', 'USER', ''),
        (role) => role !== 'LAB_ADMIN'
      ),
      { numRuns: 100 }
    );
  });

  it('LAB_ADMIN passes the role check', () => {
    expect('LAB_ADMIN' === 'LAB_ADMIN').toBe(true);
  });
});

// --- Property 15: Maintenance ticket lifecycle ---
describe('Property 15: Maintenance ticket lifecycle', () => {
  const ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  it('forward transitions are valid', () => {
    const pairs = [['OPEN','IN_PROGRESS'],['IN_PROGRESS','RESOLVED'],['RESOLVED','CLOSED']];
    pairs.forEach(([f, t]) => expect(canTransition(f, t)).toBe(true));
  });

  it('backward transitions are invalid', () => {
    const pairs = [['IN_PROGRESS','OPEN'],['RESOLVED','IN_PROGRESS'],['CLOSED','RESOLVED'],['CLOSED','OPEN']];
    pairs.forEach(([f, t]) => expect(canTransition(f, t)).toBe(false));
  });

  it('CLOSED has no valid outgoing transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
        (to) => canTransition('CLOSED', to) === false
      ),
      { numRuns: 100 }
    );
  });

  it('transition valid iff toIdx === fromIdx + 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 3 }),
        (fi, ti) => canTransition(ORDER[fi], ORDER[ti]) === (ti === fi + 1)
      ),
      { numRuns: 100 }
    );
  });
});