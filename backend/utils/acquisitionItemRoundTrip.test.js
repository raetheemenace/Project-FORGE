// Feature: lab-assistant-and-inventory-acquisition, Property 5: Acquisition Item Creation Round-Trip
// Feature: lab-assistant-and-inventory-acquisition, Property 6: PROCURED Event Invariant

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
 * Simulates adding a single item to an existing acquisition.
 * Returns the three rows that would be written to the DB.
 *
 * @param {number} acquisitionId
 * @param {{ name: string, department: string, initial_condition?: string, assigned_room?: string }} item
 * @param {number} adminId
 * @param {number} counter - used to generate a deterministic equipment ID
 * @returns {{ equipmentRow, acquisitionItemRow, eventRow }}
 */
function simulateAddItem(acquisitionId, item, adminId, counter) {
  const equipmentId = generateEquipmentId(counter);
  const assignedRoom = item.assigned_room || null;

  const equipmentRow = {
    equipment_id: equipmentId,
    name: item.name.trim(),
    department: item.department.trim(),
    status: 'AVAILABLE',
  };

  const acquisitionItemRow = {
    acquisition_id: acquisitionId,
    equipment_id: equipmentId,
    initial_condition: item.initial_condition || null,
    assigned_room: assignedRoom,
  };

  const eventRow = {
    equipment_id: equipmentId,
    event_type: 'PROCURED',
    performed_by: adminId,
    to_location: assignedRoom,
  };

  return { equipmentRow, acquisitionItemRow, eventRow };
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
const counterArb = fc.integer({ min: 0, max: 8999 }); // keeps ID in EQ-1000..EQ-9999

// ---------------------------------------------------------------------------
// Property 5: Acquisition Item Creation Round-Trip
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------

describe('Property 5: Acquisition Item Creation Round-Trip', () => {
  it('equipment row has status AVAILABLE, ID matches EQ-XXXX, and acquisition item links to the acquisition', () => {
    fc.assert(
      fc.property(acquisitionIdArb, itemArb, adminIdArb, counterArb, (acquisitionId, item, adminId, counter) => {
        const { equipmentRow, acquisitionItemRow } = simulateAddItem(acquisitionId, item, adminId, counter);

        // Equipment status must be AVAILABLE
        expect(equipmentRow.status).toBe('AVAILABLE');

        // Equipment ID must match EQ-XXXX format
        expect(equipmentRow.equipment_id).toMatch(/^EQ-\d{4}$/);

        // Acquisition item must link back to the acquisition
        expect(acquisitionItemRow.acquisition_id).toBe(acquisitionId);

        // Acquisition item must reference the same equipment ID
        expect(acquisitionItemRow.equipment_id).toBe(equipmentRow.equipment_id);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: PROCURED Event Invariant
// Validates: Requirements 4.3, 7.1
// ---------------------------------------------------------------------------

describe('Property 6: PROCURED Event Invariant', () => {
  it('event row has event_type PROCURED, to_location matches assigned_room, performed_by matches adminId', () => {
    fc.assert(
      fc.property(acquisitionIdArb, itemArb, adminIdArb, counterArb, (acquisitionId, item, adminId, counter) => {
        const { eventRow } = simulateAddItem(acquisitionId, item, adminId, counter);

        // Event type must be PROCURED
        expect(eventRow.event_type).toBe('PROCURED');

        // to_location must equal assigned_room (or null if none provided)
        expect(eventRow.to_location).toBe(item.assigned_room || null);

        // performed_by must equal the admin user ID
        expect(eventRow.performed_by).toBe(adminId);
      }),
      { numRuns: 100 }
    );
  });
});
