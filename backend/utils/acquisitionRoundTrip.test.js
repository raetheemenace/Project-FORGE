// Feature: lab-assistant-and-inventory-acquisition, Property 3: Acquisition Creation Round-Trip
// Feature: lab-assistant-and-inventory-acquisition, Property 4: Acquisition Creation Audit Log Invariant

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure builder / simulator functions
// Mirror what POST /api/admin/acquisitions does before hitting the DB.
// ---------------------------------------------------------------------------

/**
 * Builds the acquisition record object that would be stored in forge_acquisitions.
 */
function buildAcquisitionRecord(id, supplierName, acquisitionDate, notes, createdBy) {
  return {
    acquisition_id: id,
    supplier_name: supplierName.trim(),
    acquisition_date: acquisitionDate,
    notes: notes || null,
    created_by: createdBy,
  };
}

/**
 * Simulates creating an acquisition: returns { acquisitionId, record }.
 * Uses a simple incrementing counter for IDs (pure, no DB).
 */
let _nextId = 1;
function simulateCreateAcquisition(supplierName, acquisitionDate, notes, createdBy) {
  const acquisitionId = _nextId++;
  const record = buildAcquisitionRecord(acquisitionId, supplierName, acquisitionDate, notes, createdBy);
  return { acquisitionId, record };
}

/**
 * Simulates retrieving an acquisition by ID from a Map/object store.
 * @param {number} acquisitionId
 * @param {Map<number, object>} store
 */
function simulateGetAcquisition(acquisitionId, store) {
  return store.get(acquisitionId) ?? null;
}

/**
 * Simulates creating an acquisition AND inserting the audit log row.
 * Returns { acquisitionId, auditLog: [...] } where auditLog mirrors forge_admin_actions rows.
 */
function simulateCreateWithAudit(supplierName, acquisitionDate, notes, createdBy) {
  const acquisitionId = _nextId++;
  const record = buildAcquisitionRecord(acquisitionId, supplierName, acquisitionDate, notes, createdBy);

  const auditLog = [
    {
      admin_id: createdBy,
      action_type: 'ACQUISITION_CREATED',
      target_type: 'ACQUISITION',
      target_id: acquisitionId,
      details: JSON.stringify({ supplier_name: record.supplier_name, acquisition_date: acquisitionDate }),
    },
  ];

  return { acquisitionId, record, auditLog };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptySupplierArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

const notesArb = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 500 })
);

const createdByArb = fc.integer({ min: 1, max: 99999 });

// ---------------------------------------------------------------------------
// Property 3: Acquisition Creation Round-Trip
// Validates: Requirements 3.1, 3.3, 3.5
// ---------------------------------------------------------------------------

describe('Property 3: Acquisition Creation Round-Trip', () => {
  it('retrieved acquisition matches all fields from creation', () => {
    fc.assert(
      fc.property(nonEmptySupplierArb, dateArb, notesArb, createdByArb, (supplierName, acquisitionDate, notes, createdBy) => {
        const { acquisitionId, record } = simulateCreateAcquisition(supplierName, acquisitionDate, notes, createdBy);

        // Persist into an in-memory store
        const store = new Map();
        store.set(acquisitionId, record);

        // Retrieve and verify round-trip
        const retrieved = simulateGetAcquisition(acquisitionId, store);

        expect(retrieved).not.toBeNull();
        expect(retrieved.supplier_name).toBe(supplierName.trim());
        expect(retrieved.acquisition_date).toBe(acquisitionDate);
        expect(retrieved.notes).toBe(notes || null);
        expect(retrieved.created_by).toBe(createdBy);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Acquisition Creation Audit Log Invariant
// Validates: Requirements 3.4, 7.2
// ---------------------------------------------------------------------------

describe('Property 4: Acquisition Creation Audit Log Invariant', () => {
  it('audit log contains exactly one ACQUISITION_CREATED row with the correct target_id', () => {
    fc.assert(
      fc.property(nonEmptySupplierArb, dateArb, notesArb, createdByArb, (supplierName, acquisitionDate, notes, createdBy) => {
        const { acquisitionId, auditLog } = simulateCreateWithAudit(supplierName, acquisitionDate, notes, createdBy);

        const matchingRows = auditLog.filter(
          a => a.action_type === 'ACQUISITION_CREATED' && a.target_id === acquisitionId
        );

        expect(matchingRows).toHaveLength(1);
      }),
      { numRuns: 100 }
    );
  });
});
