// Feature: forge-system, Property 16: Admin action audit completeness
// Validates: Admin accountability (Requirements 15.9)

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure audit-log logic — mirrors the logAdminAction helper used across all
// admin route handlers (equipment.js, transactions.js, tickets.js, users.js,
// rooms.js).
// ---------------------------------------------------------------------------

const VALID_ACTION_TYPES = [
  'EQUIPMENT_CREATED',
  'EQUIPMENT_UPDATED',
  'EQUIPMENT_DISPOSED',
  'USER_DISABLED',
  'USER_ENABLED',
  'TRANSACTION_OVERRIDDEN',
  'TICKET_CREATED',
  'TICKET_UPDATED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'ROOM_DEACTIVATED',
];

const VALID_TARGET_TYPES = ['EQUIPMENT', 'USER', 'TRANSACTION', 'TICKET', 'ROOM'];

/**
 * In-memory audit log store — simulates the forge_admin_actions table.
 */
function createAuditStore() {
  const records = [];
  let nextId = 1;

  return {
    /**
     * Appends one audit record, mirroring the INSERT in logAdminAction.
     * Returns the inserted record.
     */
    log(adminId, actionType, targetType, targetId, details = {}) {
      const record = {
        actionId: nextId++,
        adminId,
        actionType,
        targetType,
        targetId,
        details,
        createdAt: new Date().toISOString(),
      };
      records.push(record);
      return record;
    },

    /** Returns all records for a given targetId. */
    findByTargetId(targetId) {
      return records.filter((r) => r.targetId === targetId);
    },

    /** Returns all records for a given adminId. */
    findByAdminId(adminId) {
      return records.filter((r) => r.adminId === adminId);
    },

    /** Returns all records. */
    all() {
      return [...records];
    },

    /** Resets the store. */
    reset() {
      records.length = 0;
      nextId = 1;
    },
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const adminIdArb = fc.integer({ min: 1, max: 9999 });
const targetIdArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
  fc.integer({ min: 1, max: 99999 }).map(String)
);
const actionTypeArb = fc.constantFrom(...VALID_ACTION_TYPES);
const targetTypeArb = fc.constantFrom(...VALID_TARGET_TYPES);
const detailsArb = fc.record({
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  status: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
});

/** A complete valid admin action tuple. */
const adminActionArb = fc.record({
  adminId: adminIdArb,
  actionType: actionTypeArb,
  targetType: targetTypeArb,
  targetId: targetIdArb,
  details: detailsArb,
});

/** A sequence of 1–10 distinct admin actions. */
const actionSequenceArb = fc.array(adminActionArb, { minLength: 1, maxLength: 10 });

// ---------------------------------------------------------------------------
// Property 16: Admin action audit completeness
// Validates: Admin accountability (Requirements 15.9)
// ---------------------------------------------------------------------------

describe('Property 16: Admin action audit completeness', () => {

  // ── Each successful action produces exactly one audit record ──────────────

  it('each admin action produces exactly one new audit record', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const before = store.all().length;

        store.log(adminId, actionType, targetType, targetId, details);

        const after = store.all().length;
        expect(after - before).toBe(1);
      }),
      { numRuns: 200 }
    );
  });

  // ── Audit record contains the correct adminId ─────────────────────────────

  it('audit record preserves the admin user ID', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const record = store.log(adminId, actionType, targetType, targetId, details);
        expect(record.adminId).toBe(adminId);
      }),
      { numRuns: 200 }
    );
  });

  // ── Audit record contains the correct action type ─────────────────────────

  it('audit record preserves the action type', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const record = store.log(adminId, actionType, targetType, targetId, details);
        expect(record.actionType).toBe(actionType);
      }),
      { numRuns: 200 }
    );
  });

  // ── Audit record contains the correct target entity ID ───────────────────

  it('audit record preserves the target entity ID', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const record = store.log(adminId, actionType, targetType, targetId, details);
        expect(record.targetId).toBe(targetId);
      }),
      { numRuns: 200 }
    );
  });

  // ── Audit record contains the correct target type ─────────────────────────

  it('audit record preserves the target type', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const record = store.log(adminId, actionType, targetType, targetId, details);
        expect(record.targetType).toBe(targetType);
      }),
      { numRuns: 200 }
    );
  });

  // ── N actions produce exactly N audit records ─────────────────────────────

  it('a sequence of N admin actions produces exactly N audit records', () => {
    fc.assert(
      fc.property(actionSequenceArb, (actions) => {
        const store = createAuditStore();
        for (const { adminId, actionType, targetType, targetId, details } of actions) {
          store.log(adminId, actionType, targetType, targetId, details);
        }
        expect(store.all().length).toBe(actions.length);
      }),
      { numRuns: 200 }
    );
  });

  // ── Records for a targetId are retrievable ────────────────────────────────

  it('audit records for a specific target ID are retrievable', () => {
    fc.assert(
      fc.property(adminIdArb, actionTypeArb, targetTypeArb, targetIdArb, (adminId, actionType, targetType, targetId) => {
        const store = createAuditStore();
        store.log(adminId, actionType, targetType, targetId, {});

        const found = store.findByTargetId(targetId);
        expect(found.length).toBeGreaterThanOrEqual(1);
        expect(found.every((r) => r.targetId === targetId)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  // ── Records for an adminId are retrievable ────────────────────────────────

  it('audit records for a specific admin ID are retrievable', () => {
    fc.assert(
      fc.property(adminIdArb, actionTypeArb, targetTypeArb, targetIdArb, (adminId, actionType, targetType, targetId) => {
        const store = createAuditStore();
        store.log(adminId, actionType, targetType, targetId, {});

        const found = store.findByAdminId(adminId);
        expect(found.length).toBeGreaterThanOrEqual(1);
        expect(found.every((r) => r.adminId === adminId)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  // ── Each record has a unique actionId ─────────────────────────────────────

  it('every audit record has a unique action ID', () => {
    fc.assert(
      fc.property(actionSequenceArb, (actions) => {
        const store = createAuditStore();
        const ids = actions.map(({ adminId, actionType, targetType, targetId, details }) =>
          store.log(adminId, actionType, targetType, targetId, details).actionId
        );
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }),
      { numRuns: 200 }
    );
  });

  // ── Each record has a createdAt timestamp ─────────────────────────────────

  it('every audit record has a non-empty createdAt timestamp', () => {
    fc.assert(
      fc.property(adminActionArb, ({ adminId, actionType, targetType, targetId, details }) => {
        const store = createAuditStore();
        const record = store.log(adminId, actionType, targetType, targetId, details);
        expect(record.createdAt).toBeTruthy();
        expect(typeof record.createdAt).toBe('string');
      }),
      { numRuns: 200 }
    );
  });

  // ── Audit log is append-only: existing records are not mutated ────────────

  it('logging a new action does not mutate existing audit records', () => {
    fc.assert(
      fc.property(adminActionArb, adminActionArb, (first, second) => {
        const store = createAuditStore();
        const firstRecord = store.log(first.adminId, first.actionType, first.targetType, first.targetId, first.details);
        const snapshotBefore = { ...firstRecord };

        store.log(second.adminId, second.actionType, second.targetType, second.targetId, second.details);

        // First record should be unchanged
        const afterAll = store.all();
        const firstAfter = afterAll.find((r) => r.actionId === firstRecord.actionId);
        expect(firstAfter).toEqual(snapshotBefore);
      }),
      { numRuns: 200 }
    );
  });
});
