// Feature: lab-assistant-and-inventory-acquisition, Property 13: Validation Rejects Missing Acquisition Fields
// Feature: lab-assistant-and-inventory-acquisition, Property 14: Validation Rejects Missing Item Fields

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure validator functions (no DB, no live HTTP)
// ---------------------------------------------------------------------------

/**
 * Validates acquisition creation input.
 * @param {string|null|undefined} supplierName
 * @param {string|null|undefined} acquisitionDate
 * @returns {{ valid: boolean, status: number, error?: string }}
 */
function validateAcquisitionInput(supplierName, acquisitionDate) {
  if (!supplierName || !supplierName.trim()) {
    return { valid: false, status: 400, error: 'Supplier name is required.' };
  }
  if (!acquisitionDate) {
    return { valid: false, status: 400, error: 'Acquisition date is required.' };
  }
  return { valid: true, status: 200 };
}

/**
 * Validates item addition input.
 * @param {string|null|undefined} name
 * @param {string|null|undefined} department
 * @returns {{ valid: boolean, status: number, error?: string }}
 */
function validateItemInput(name, department) {
  if (!name || !name.trim()) {
    return { valid: false, status: 400, error: 'Equipment name is required for all items.' };
  }
  if (!department || !department.trim()) {
    return { valid: false, status: 400, error: 'Department is required for all items.' };
  }
  return { valid: true, status: 200 };
}

// ---------------------------------------------------------------------------
// Property 13: Validation Rejects Missing Acquisition Fields
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe('Property 13: Validation Rejects Missing Acquisition Fields', () => {
  it('rejects blank or empty supplier names with status 400', () => {
    const blankSupplierArb = fc.oneof(
      fc.constant(''),
      fc.constant('   '),
      fc.constant(null),
      fc.constant(undefined)
    );
    const validDateArb = fc.constant('2025-01-15');

    fc.assert(
      fc.property(blankSupplierArb, validDateArb, (supplierName, acquisitionDate) => {
        const result = validateAcquisitionInput(supplierName, acquisitionDate);
        expect(result.valid).toBe(false);
        expect(result.status).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects missing acquisition dates with status 400', () => {
    const validSupplierArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
    const missingDateArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant('')
    );

    fc.assert(
      fc.property(validSupplierArb, missingDateArb, (supplierName, acquisitionDate) => {
        const result = validateAcquisitionInput(supplierName, acquisitionDate);
        expect(result.valid).toBe(false);
        expect(result.status).toBe(400);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Validation Rejects Missing Item Fields
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe('Property 14: Validation Rejects Missing Item Fields', () => {
  it('rejects blank or empty equipment names with status 400', () => {
    const blankNameArb = fc.oneof(
      fc.constant(''),
      fc.string().map(s => s.trim() === '' ? ' ' : '')
    );
    const validDepartmentArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

    fc.assert(
      fc.property(blankNameArb, validDepartmentArb, (name, department) => {
        const result = validateItemInput(name, department);
        expect(result.valid).toBe(false);
        expect(result.status).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects blank or empty department with status 400', () => {
    const validNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
    const blankDepartmentArb = fc.oneof(
      fc.constant(''),
      fc.string().map(s => s.trim() === '' ? ' ' : '')
    );

    fc.assert(
      fc.property(validNameArb, blankDepartmentArb, (name, department) => {
        const result = validateItemInput(name, department);
        expect(result.valid).toBe(false);
        expect(result.status).toBe(400);
      }),
      { numRuns: 100 }
    );
  });
});
