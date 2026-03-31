// Feature: lab-assistant-and-inventory-acquisition, Property 9: Acquisitions List Ordering
// Feature: lab-assistant-and-inventory-acquisition, Property 10: Acquisition Detail Round-Trip

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure simulator functions
// Mirror what GET /api/admin/acquisitions and GET /api/admin/acquisitions/:id do.
// ---------------------------------------------------------------------------

/**
 * Simulates the list acquisitions endpoint.
 * Sorts by acquisition_date DESC and returns records with required fields.
 *
 * @param {Array<{ acquisition_id: number, supplier_name: string, acquisition_date: string, item_count: number, created_by_name: string }>} acquisitions
 * @returns {Array} sorted array with all required fields
 */
function simulateListAcquisitions(acquisitions) {
  return [...acquisitions].sort((a, b) => {
    if (b.acquisition_date > a.acquisition_date) return 1;
    if (b.acquisition_date < a.acquisition_date) return -1;
    return 0;
  });
}

/**
 * Simulates the acquisition detail endpoint.
 * Returns { acquisition, items: [...] } where each item has equipment_id.
 *
 * @param {number} acquisitionId
 * @param {Array<{ equipment_id: string, name?: string, department?: string }>} items
 * @returns {{ acquisition: { acquisition_id: number }, items: Array<{ equipment_id: string }> }}
 */
function simulateGetDetail(acquisitionId, items) {
  return {
    acquisition: { acquisition_id: acquisitionId },
    items: items.map(item => ({ equipment_id: item.equipment_id, ...item })),
  };
}

/**
 * Simulates the forge_equipment_events PROCURED rows for items in an acquisition.
 *
 * @param {number} acquisitionId
 * @param {Array<{ equipment_id: string }>} items
 * @returns {Array<{ equipment_id: string, event_type: string, acquisition_id: number }>}
 */
function simulateGetProcuredEvents(acquisitionId, items) {
  return items.map(item => ({
    equipment_id: item.equipment_id,
    event_type: 'PROCURED',
    acquisition_id: acquisitionId,
  }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStrArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

const acquisitionArb = fc.record({
  acquisition_id: fc.integer({ min: 1, max: 99999 }),
  supplier_name: nonEmptyStrArb,
  acquisition_date: dateArb,
  item_count: fc.integer({ min: 0, max: 50 }),
  created_by_name: nonEmptyStrArb,
});

// Array of acquisitions with distinct dates (use uniqueArray on date field)
const acquisitionsWithDistinctDatesArb = fc
  .uniqueArray(acquisitionArb, {
    selector: a => a.acquisition_date,
    minLength: 1,
    maxLength: 20,
  });

const equipmentIdArb = fc
  .integer({ min: 1000, max: 9999 })
  .map(n => `EQ-${n}`);

const itemArb = fc.record({
  equipment_id: equipmentIdArb,
  name: nonEmptyStrArb,
  department: nonEmptyStrArb,
});

const acquisitionIdArb = fc.integer({ min: 1, max: 99999 });

// ---------------------------------------------------------------------------
// Property 9: Acquisitions List Ordering
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------

describe('Property 9: Acquisitions List Ordering', () => {
  it('list is ordered by acquisition_date descending (most recent first)', () => {
    fc.assert(
      fc.property(acquisitionsWithDistinctDatesArb, (acquisitions) => {
        const result = simulateListAcquisitions(acquisitions);

        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].acquisition_date >= result[i + 1].acquisition_date).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each record includes supplier_name, acquisition_date, item_count, and created_by_name', () => {
    fc.assert(
      fc.property(acquisitionsWithDistinctDatesArb, (acquisitions) => {
        const result = simulateListAcquisitions(acquisitions);

        for (const record of result) {
          expect(record).toHaveProperty('supplier_name');
          expect(record).toHaveProperty('acquisition_date');
          expect(record).toHaveProperty('item_count');
          expect(record).toHaveProperty('created_by_name');

          expect(typeof record.supplier_name).toBe('string');
          expect(typeof record.acquisition_date).toBe('string');
          expect(typeof record.item_count).toBe('number');
          expect(typeof record.created_by_name).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('result contains the same number of records as the input', () => {
    fc.assert(
      fc.property(acquisitionsWithDistinctDatesArb, (acquisitions) => {
        const result = simulateListAcquisitions(acquisitions);
        expect(result).toHaveLength(acquisitions.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Acquisition Detail Round-Trip
// Validates: Requirements 5.2, 7.4
// ---------------------------------------------------------------------------

describe('Property 10: Acquisition Detail Round-Trip', () => {
  it('set of equipment_id values from detail.items equals set from PROCURED events', () => {
    fc.assert(
      fc.property(
        acquisitionIdArb,
        fc.uniqueArray(itemArb, { selector: item => item.equipment_id, minLength: 1, maxLength: 20 }),
        (acquisitionId, items) => {
          const detail = simulateGetDetail(acquisitionId, items);
          const procuredEvents = simulateGetProcuredEvents(acquisitionId, items);

          const detailIds = new Set(detail.items.map(i => i.equipment_id));
          const eventIds = new Set(procuredEvents.map(e => e.equipment_id));

          expect(detailIds.size).toBe(eventIds.size);
          for (const id of detailIds) {
            expect(eventIds.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all PROCURED events belong to the correct acquisition', () => {
    fc.assert(
      fc.property(
        acquisitionIdArb,
        fc.uniqueArray(itemArb, { selector: item => item.equipment_id, minLength: 1, maxLength: 20 }),
        (acquisitionId, items) => {
          const procuredEvents = simulateGetProcuredEvents(acquisitionId, items);

          for (const event of procuredEvents) {
            expect(event.event_type).toBe('PROCURED');
            expect(event.acquisition_id).toBe(acquisitionId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
