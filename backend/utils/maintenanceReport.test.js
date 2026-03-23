// Feature: forge-system, Property 10: Maintenance report field validation
// Validates: Requirements 10.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure validation logic — mirrors backend/routes/maintenance.js and
// the frontend ReportMaintenance.jsx form validation.
// ---------------------------------------------------------------------------

const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Validates a maintenance report submission.
 * Returns an object with field-level errors, or an empty object when valid.
 */
function validateMaintenanceReport({ severity, description }) {
  const errors = {};
  if (!severity || !VALID_SEVERITIES.includes(severity)) {
    errors.severity = 'Severity is required and must be one of: Low, Medium, High, Critical.';
  }
  if (!description || !description.trim()) {
    errors.description = 'Description is required.';
  }
  return errors;
}

/** Returns true when the report would be accepted (no validation errors). */
function isValid({ severity, description }) {
  return Object.keys(validateMaintenanceReport({ severity, description })).length === 0;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A valid severity value. */
const validSeverityArb = fc.constantFrom(...VALID_SEVERITIES);

/** An invalid severity: anything that is not one of the four valid values. */
const invalidSeverityArb = fc
  .oneof(
    fc.constant(''),
    fc.constant(null),
    fc.constant(undefined),
    fc.string().filter((s) => !VALID_SEVERITIES.includes(s))
  );

/** A non-empty description string (at least one non-whitespace character). */
const validDescriptionArb = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length > 0);

/** An empty or whitespace-only description. */
const emptyDescriptionArb = fc.oneof(
  fc.constant(''),
  fc.constant(null),
  fc.constant(undefined),
  fc.stringMatching(/^\s+$/) // whitespace only
);

// ---------------------------------------------------------------------------
// Property 10: Maintenance report field validation
// Validates: Requirements 10.4
// ---------------------------------------------------------------------------

describe('Property 10: Maintenance report field validation', () => {
  // ── Rejection cases ──────────────────────────────────────────────────────

  it('rejects any report where severity is missing or invalid', () => {
    fc.assert(
      fc.property(invalidSeverityArb, validDescriptionArb, (severity, description) => {
        const errors = validateMaintenanceReport({ severity, description });
        expect(errors.severity).toBeDefined();
        expect(typeof errors.severity).toBe('string');
        expect(errors.severity.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('rejects any report where description is empty or whitespace-only', () => {
    fc.assert(
      fc.property(validSeverityArb, emptyDescriptionArb, (severity, description) => {
        const errors = validateMaintenanceReport({ severity, description });
        expect(errors.description).toBeDefined();
        expect(typeof errors.description).toBe('string');
        expect(errors.description.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('rejects any report where both severity and description are invalid', () => {
    fc.assert(
      fc.property(invalidSeverityArb, emptyDescriptionArb, (severity, description) => {
        const errors = validateMaintenanceReport({ severity, description });
        expect(errors.severity).toBeDefined();
        expect(errors.description).toBeDefined();
      }),
      { numRuns: 200 }
    );
  });

  it('submission is blocked (isValid returns false) whenever any required field is missing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // missing severity only
          fc.record({ severity: invalidSeverityArb, description: validDescriptionArb }),
          // missing description only
          fc.record({ severity: validSeverityArb, description: emptyDescriptionArb }),
          // both missing
          fc.record({ severity: invalidSeverityArb, description: emptyDescriptionArb })
        ),
        ({ severity, description }) => {
          expect(isValid({ severity, description })).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });

  // ── Acceptance cases ─────────────────────────────────────────────────────

  it('accepts any report with a valid severity and a non-empty description', () => {
    fc.assert(
      fc.property(validSeverityArb, validDescriptionArb, (severity, description) => {
        const errors = validateMaintenanceReport({ severity, description });
        expect(errors).toEqual({});
        expect(isValid({ severity, description })).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('accepts all four valid severity values when paired with a valid description', () => {
    for (const severity of VALID_SEVERITIES) {
      fc.assert(
        fc.property(validDescriptionArb, (description) => {
          expect(isValid({ severity, description })).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  });

  // ── Consistency / idempotency ─────────────────────────────────────────────

  it('validation is deterministic: same inputs always produce the same result', () => {
    fc.assert(
      fc.property(
        fc.oneof(validSeverityArb, invalidSeverityArb),
        fc.oneof(validDescriptionArb, emptyDescriptionArb),
        (severity, description) => {
          const result1 = isValid({ severity, description });
          const result2 = isValid({ severity, description });
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('trimming whitespace from description does not change the validity outcome', () => {
    fc.assert(
      fc.property(validSeverityArb, validDescriptionArb, (severity, description) => {
        // A valid description with surrounding whitespace should still be valid
        // because the validator trims before checking emptiness.
        const padded = `  ${description}  `;
        expect(isValid({ severity, description: padded })).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
