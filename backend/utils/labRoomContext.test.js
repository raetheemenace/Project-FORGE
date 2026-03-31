// Feature: lab-assistant-and-inventory-acquisition, Property 1: Per-Room Context Completeness
// Feature: lab-assistant-and-inventory-acquisition, Property 2: Booked Equipment Excluded from Available List
// Feature: lab-assistant-and-inventory-acquisition, Property 12: Acquisition Item Immediately Visible in Live Context

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildRoomContext } from '../routes/ai.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const roomIdArb = fc.constantFrom('A-101', 'A-102', 'B-201', 'B-202', 'C-301', 'C-302');

const roomArb = fc.record({
  room_id: roomIdArb,
  room_name: fc.string({ minLength: 3, maxLength: 40 }),
  department: fc.constantFrom('Computer Engineering', 'Electronics Engineering', 'Civil Engineering'),
  room_status: fc.constantFrom('ACTIVE', 'MAINTENANCE', 'INACTIVE'),
});

// Generate a unique set of rooms (distinct room_ids)
const uniqueRoomsArb = fc
  .array(roomArb, { minLength: 1, maxLength: 4 })
  .map((rooms) => {
    const seen = new Set();
    return rooms.filter((r) => {
      if (seen.has(r.room_id)) return false;
      seen.add(r.room_id);
      return true;
    });
  })
  .filter((rooms) => rooms.length >= 1);

const equipIdArb = fc
  .integer({ min: 1, max: 9998 }) // exclude 9999 to avoid collision with hardcoded base row EQ-9999
  .map((n) => `EQ-${String(n).padStart(4, '0')}`);

// Build equipment rows for a given set of rooms (no bookings)
function buildAvailableRows(rooms, equipList) {
  return equipList.map((eq) => ({
    room_id: eq.room_id,
    room_name: rooms.find((r) => r.room_id === eq.room_id)?.room_name ?? 'Unknown',
    department: rooms.find((r) => r.room_id === eq.room_id)?.department ?? 'Unknown',
    room_status: rooms.find((r) => r.room_id === eq.room_id)?.room_status ?? 'ACTIVE',
    equipment_id: eq.equipment_id,
    equipment_name: eq.equipment_name,
    equipment_status: 'AVAILABLE',
    booked_slot: null,
    borrower_name: null,
  }));
}

// ---------------------------------------------------------------------------
// Property 1: Per-Room Context Completeness
// Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.3
// ---------------------------------------------------------------------------
describe('Property 1: Per-Room Context Completeness', () => {
  it('output includes each room ID, correct available count, and each equipment name', () => {
    fc.assert(
      fc.property(
        uniqueRoomsArb,
        (rooms) => {
          // Generate equipment assigned to these rooms
          const equipList = rooms.flatMap((room, i) =>
            Array.from({ length: i + 1 }, (_, j) => ({
              equipment_id: `EQ-${String(i * 10 + j + 1).padStart(4, '0')}`,
              equipment_name: `Equipment ${room.room_id}-${j + 1}`,
              room_id: room.room_id,
            }))
          );

          const rows = buildAvailableRows(rooms, equipList);

          // Add room rows with null equipment for rooms that might have no equipment
          // (rooms are already covered via equipList above)
          const context = buildRoomContext(rows);

          for (const room of rooms) {
            // Each room ID must appear in the output
            expect(context).toContain(room.room_id);

            // Find equipment for this room
            const roomEquip = equipList.filter((e) => e.room_id === room.room_id);
            const availCount = roomEquip.length;

            // Available count must be correct
            expect(context).toContain(`Available (${availCount}):`);

            // Each equipment name must appear in the available list
            for (const eq of roomEquip) {
              expect(context).toContain(eq.equipment_name);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Booked Equipment Excluded from Available List
// Validates: Requirements 1.3, 1.6
// ---------------------------------------------------------------------------
describe('Property 2: Booked Equipment Excluded from Available List', () => {
  it('booked equipment appears in Booked section and NOT in Available section', () => {
    fc.assert(
      fc.property(
        uniqueRoomsArb,
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        (rooms, timeSlot, borrowerName) => {
          const room = rooms[0];

          // One available item, one booked item
          const availableEq = {
            equipment_id: 'EQ-0001',
            equipment_name: 'Available Equipment Alpha',
            room_id: room.room_id,
          };
          const bookedEq = {
            equipment_id: 'EQ-0002',
            equipment_name: 'Booked Equipment Beta',
            room_id: room.room_id,
          };

          const rows = [
            {
              room_id: room.room_id,
              room_name: room.room_name,
              department: room.department,
              room_status: room.room_status,
              equipment_id: availableEq.equipment_id,
              equipment_name: availableEq.equipment_name,
              equipment_status: 'AVAILABLE',
              booked_slot: null,
              borrower_name: null,
            },
            {
              room_id: room.room_id,
              room_name: room.room_name,
              department: room.department,
              room_status: room.room_status,
              equipment_id: bookedEq.equipment_id,
              equipment_name: bookedEq.equipment_name,
              equipment_status: 'AVAILABLE',
              booked_slot: timeSlot,
              borrower_name: borrowerName,
            },
          ];

          const context = buildRoomContext(rows);

          // Split context into Available and Booked sections for this room
          // The format is: "Available (N): ...\nBooked (N): ..."
          const availableLineMatch = context.match(/Available \(\d+\): ([^\n]*)/);
          const bookedLineMatch = context.match(/Booked \(\d+\): ([^\n]*)/);

          const availableLine = availableLineMatch ? availableLineMatch[1] : '';
          const bookedLine = bookedLineMatch ? bookedLineMatch[1] : '';

          // Booked equipment must appear in the Booked section
          expect(bookedLine).toContain(bookedEq.equipment_name);

          // Booked equipment must NOT appear in the Available section
          expect(availableLine).not.toContain(bookedEq.equipment_name);

          // Available equipment must appear in the Available section
          expect(availableLine).toContain(availableEq.equipment_name);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Acquisition Item Immediately Visible in Live Context
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------
describe('Property 12: Acquisition Item Immediately Visible in Live Context', () => {
  it('newly acquired equipment appears in available list after acquisition is committed', () => {
    fc.assert(
      fc.property(
        uniqueRoomsArb,
        equipIdArb,
        // Use non-empty, non-whitespace equipment names so they appear distinctly in output
        fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3),
        (rooms, newEquipId, newEquipName) => {
          const room = rooms[0];

          // Base rows: existing equipment in the room (no bookings)
          const baseRows = [
            {
              room_id: room.room_id,
              room_name: room.room_name,
              department: room.department,
              room_status: room.room_status,
              equipment_id: 'EQ-9999',
              equipment_name: 'Existing Equipment',
              equipment_status: 'AVAILABLE',
              booked_slot: null,
              borrower_name: null,
            },
          ];

          // Context before acquisition — new item not yet present
          const contextBefore = buildRoomContext(baseRows);
          const beforeMatch = contextBefore.match(/Available \((\d+)\):/);
          const countBefore = beforeMatch ? parseInt(beforeMatch[1], 10) : 0;

          // Simulate acquisition commit: add new equipment row with booked_slot: null
          const newRow = {
            room_id: room.room_id,
            room_name: room.room_name,
            department: room.department,
            room_status: room.room_status,
            equipment_id: newEquipId,
            equipment_name: newEquipName,
            equipment_status: 'AVAILABLE',
            booked_slot: null,
            borrower_name: null,
          };

          const updatedRows = [...baseRows, newRow];
          const contextAfter = buildRoomContext(updatedRows);

          // The new equipment name must appear in the context after acquisition
          expect(contextAfter).toContain(newEquipName);

          // Available count must have increased by 1
          const afterMatch = contextAfter.match(/Available \((\d+)\):/);
          const countAfter = afterMatch ? parseInt(afterMatch[1], 10) : 0;
          expect(countAfter).toBe(countBefore + 1);

          // The room section must still be present
          expect(contextAfter).toContain(room.room_id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
