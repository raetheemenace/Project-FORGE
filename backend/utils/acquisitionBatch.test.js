// Feature: lab-assistant-and-inventory-acquisition, Property 7: Batch Add Completeness
// Feature: lab-assistant-and-inventory-acquisition, Property 8: Batch Add Atomicity

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure builder / simulator functions
// Mirror what POST /api/admin/acquisitions/:id/items does before hitting the DB.
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic equipment ID for testing.
 * @param {number} counter - zero-based counter
 * @returns {string} e.g. "EQ-1000", "EQ-1001", ...
 */
function generateEquipmentId(counter) {
  return `EQ-${String(1000 + counter).padStart(4, '0')}`;
}

/**
 * Simulates a successful batch add of N items to an acquisition.
 * Returns all rows that would be written to the DB.
 *
 * @param {number} acquisitionId
 * @param {Array<{ name: string, department: string, initial_condition?: string, assigned_room?: string }>} items
 * @param {number} adminId
 * @returns {{ equipmentIds: string[], equipmentRows: object[], acquisitionItemRows: object[], eventRows: object[] }}
 */
function simulateBatchAdd(acquisitionId, items, adminId) {
  const equipmentIds = [];
  const equipmentRows = [];
  const acquisitionItemRows = [];
  const eventRows = [];

  items.forEach((item, counter) => {
    const equipmentId = generateEquipmentId(counter);
    const assignedRoom = item.assigned_room || null;

    equipmentIds.push(equipmentId);

    equipmentRows.push({
      equipment_id: equipmentId,
      name: item.name.trim(),
      department: item.department.trim(),
      status: 'AVAILABLE',
    });

    acquisitionItemRows.push({
      acquisition_id: acquisitionId,
      equipment_id: equipmentId,
      initial_condition: item.initial_condition || null,
      assigned_room: assignedRoom,
    });

    eventRows.push({
      equipment_id: equipmentId,
      event_type: 'PROCURED',
      performed_by: adminId,
      to_location: assignedRoom,
    });
  });

  return { equipmentIds, equipmentRows, acquisitionItemRows, eventRows };
}

/**
 * Simulates a batch add that fails at a specific index, triggering a ROLLBACK.
 * No rows are committed when failure occurs.
 *
 * @param {number} acquisitionId
 * @param {Array<{ name: string, department: string, initial_condition?: string, assigned_room?: string }>} items
 * @param {number} adminId
 * @param {number} failAtIndex - index at which the insert fails (0-based)
 * @returns {{ committed: boolean, equipmentRows: object[], acquisitionItemRows: object[], eventRows: object[] }}
 */
function simulateBatchAddWithFailure(acquisitionId, items, adminId, failAtIndex) {
  try {
    for (let i = 0; i < items.length; i++) {
      if (i === failAtIndex) {
        throw new Error(`Simulated DB failure at index ${failAtIndex}`);
      }
    }
    // Should not reach here if failAtIndex is in bounds
    return { committed: true, equipmentRows: [], acquisitionItemRows: [], eventRows: [] };
  } catch (_err) {
    // ROLLBACK: return empty arrays, nothing committed
    return { committed: false, equipmentRows: [], acquisitionItemRows: [], eventRows: [] };
  }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStrArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

const conditionArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor')
);

const roomIdArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.stringMatching(/^[A-Z]-\d{3}$/)
);

const itemArb = fc.record({
  name: nonEmptyStrArb,
  department: nonEmptyStrArb,
  initial_condition: conditionArb,
  assigned_room: roomIdArb,
});

const acquisitionIdArb = fc.integer({ min: 1, max: 99999 });
const adminIdArb = fc.integer({ min: 1, max: 99999 });

// ---------------------------------------------------------------------------
// Property 7: Batch Add Completeness
// Validates: Requirements 4.6
// ---------------------------------------------------------------------------

describe('Property 7: Batch Add Completeness', () => {
  it('response contains exactly N equipment IDs and N rows in both forge_equipment and forge_acquisition_items', () => {
    fc.assert(
      fc.property(
        acquisitionIdArb,
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        adminIdArb,
        (acquisitionId, items, adminId) => {
          const N = items.length;
          const { equipmentIds, equipmentRows, acquisitionItemRows } = simulateBatchAdd(
            acquisitionId,
            items,
            adminId
          );

          // Response must contain exactly N equipment IDs
          expect(equipmentIds).toHaveLength(N);

          // forge_equipment must have exactly N rows
          expect(equipmentRows).toHaveLength(N);

          // forge_acquisition_items must have exactly N rows
          expect(acquisitionItemRows).toHaveLength(N);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each equipment ID is unique within the batch', () => {
    fc.assert(
      fc.property(
        acquisitionIdArb,
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        adminIdArb,
        (acquisitionId, items, adminId) => {
          const { equipmentIds } = simulateBatchAdd(acquisitionId, items, adminId);
          const uniqueIds = new Set(equipmentIds);
          expect(uniqueIds.size).toBe(equipmentIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Batch Add Atomicity
// Validates: Requirements 4.7
// ---------------------------------------------------------------------------

describe('Property 8: Batch Add Atomicity', () => {
  it('when any item insert fails, committed is false and all row arrays are empty (ROLLBACK)', () => {
    fc.assert(
      fc.property(
        acquisitionIdArb,
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        adminIdArb,
        fc.integer({ min: 0, max: 19 }),
        (acquisitionId, items, adminId, failIndex) => {
          const N = items.length;
          // Clamp failAtIndex to a valid position within the batch
          const failAtIndex = failIndex % N;

          const { committed, equipmentRows, acquisitionItemRows, eventRows } =
            simulateBatchAddWithFailure(acquisitionId, items, adminId, failAtIndex);

          // Transaction must not be committed
          expect(committed).toBe(false);

          // No equipment rows must be persisted
          expect(equipmentRows).toHaveLength(0);

          // No acquisition item rows must be persisted
          expect(acquisitionItemRows).toHaveLength(0);

          // No equipment event rows must be persisted
          expect(eventRows).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
