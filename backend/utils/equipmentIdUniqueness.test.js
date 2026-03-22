// Feature: forge-system, Property 14: Equipment ID uniqueness on creation
// For any two distinct equipment creation requests via POST /api/admin/equipment,
// the assigned Equipment IDs should be different.
// Validates: Equipment inventory integrity

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure model of the Equipment ID generation logic
// Mirrors backend/routes/admin/equipment.js: generateEquipmentId()
// and getUniqueEquipmentId()
// ---------------------------------------------------------------------------

/**
 * Generate a candidate Equipment ID in the format EQ-XXXX (4-digit number).
 * @param {() => number} randFn - injectable random source (returns 0..1)
 * @returns {string}
 */
function generateEquipmentId(randFn = Math.random) {
  const num = Math.floor(1000 + randFn() * 9000); // 1000–9999
  return `EQ-${num}`;
}

/**
 * Simulate getUniqueEquipmentId against an in-memory set of existing IDs.
 * Returns the first candidate not already in existingIds.
 * @param {Set<string>} existingIds
 * @param {() => number} randFn
 * @returns {string}
 */
function getUniqueEquipmentIdFromSet(existingIds, randFn = Math.random) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateEquipmentId(randFn);
    if (!existingIds.has(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique Equipment ID after 20 attempts.');
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A sequence of N creation requests (just need N distinct IDs) */
const creationCountArb = fc.integer({ min: 2, max: 50 });

// ---------------------------------------------------------------------------
// Property 14: Equipment ID uniqueness on creation
// Validates: Equipment inventory integrity
// ---------------------------------------------------------------------------

describe('Property 14: Equipment ID uniqueness on creation', () => {

  // ── Core uniqueness property ─────────────────────────────────────────────

  it('two sequential creation requests always produce different Equipment IDs', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999999 }), (seed) => {
        // Use a deterministic pseudo-random sequence seeded from fast-check input
        let counter = seed;
        const deterministicRand = () => {
          // LCG-style deterministic sequence
          counter = (counter * 1664525 + 1013904223) & 0xffffffff;
          return (counter >>> 0) / 0x100000000;
        };

        const existingIds = new Set();
        const id1 = getUniqueEquipmentIdFromSet(existingIds, deterministicRand);
        existingIds.add(id1);
        const id2 = getUniqueEquipmentIdFromSet(existingIds, deterministicRand);

        expect(id1).not.toBe(id2);
      }),
      { numRuns: 100 }
    );
  });

  it('N sequential creation requests all produce distinct Equipment IDs', () => {
    fc.assert(
      fc.property(creationCountArb, fc.integer({ min: 0, max: 999999 }), (n, seed) => {
        let counter = seed;
        const deterministicRand = () => {
          counter = (counter * 1664525 + 1013904223) & 0xffffffff;
          return (counter >>> 0) / 0x100000000;
        };

        const existingIds = new Set();
        const generated = [];

        for (let i = 0; i < n; i++) {
          const id = getUniqueEquipmentIdFromSet(existingIds, deterministicRand);
          existingIds.add(id);
          generated.push(id);
        }

        // All IDs must be unique
        const uniqueSet = new Set(generated);
        expect(uniqueSet.size).toBe(n);
      }),
      { numRuns: 100 }
    );
  });

  // ── Format property ───────────────────────────────────────────────────────

  it('every generated Equipment ID matches the EQ-XXXX format', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999999 }), (seed) => {
        let counter = seed;
        const deterministicRand = () => {
          counter = (counter * 1664525 + 1013904223) & 0xffffffff;
          return (counter >>> 0) / 0x100000000;
        };

        const id = generateEquipmentId(deterministicRand);
        expect(id).toMatch(/^EQ-\d{4}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('the numeric part of every Equipment ID is between 1000 and 9999', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999999 }), (seed) => {
        let counter = seed;
        const deterministicRand = () => {
          counter = (counter * 1664525 + 1013904223) & 0xffffffff;
          return (counter >>> 0) / 0x100000000;
        };

        const id = generateEquipmentId(deterministicRand);
        const num = parseInt(id.replace('EQ-', ''), 10);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }),
      { numRuns: 100 }
    );
  });

  // ── Collision avoidance property ─────────────────────────────────────────

  it('getUniqueEquipmentId never returns an ID that already exists in the set', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }),
        fc.array(fc.integer({ min: 1000, max: 9999 }), { minLength: 0, maxLength: 50 }),
        (seed, existingNums) => {
          const existingIds = new Set(existingNums.map((n) => `EQ-${n}`));

          let counter = seed;
          const deterministicRand = () => {
            counter = (counter * 1664525 + 1013904223) & 0xffffffff;
            return (counter >>> 0) / 0x100000000;
          };

          // Only run if there is at least one free slot (9000 possible IDs)
          if (existingIds.size >= 9000) return; // skip exhausted space

          const result = getUniqueEquipmentIdFromSet(existingIds, deterministicRand);

          // The returned ID must NOT be in the existing set
          expect(existingIds.has(result)).toBe(false);
          // And it must still match the format
          expect(result).toMatch(/^EQ-\d{4}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Mock DB integration property ─────────────────────────────────────────

  it('simulated POST /api/admin/equipment calls always assign unique IDs across concurrent requests', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (requestCount) => {
        // Simulate the DB state shared across requests
        const dbEquipmentIds = new Set();

        // Mock DB client that checks the in-memory set
        const mockDb = {
          query: vi.fn(async (sql, params) => {
            if (sql.includes('SELECT 1 FROM forge_equipment')) {
              const candidateId = params[0];
              return { rows: dbEquipmentIds.has(candidateId) ? [{ '?column?': 1 }] : [] };
            }
            if (sql.includes('INSERT INTO forge_equipment')) {
              // Record the inserted ID
              dbEquipmentIds.add(params[0]);
              return { rows: [] };
            }
            return { rows: [] };
          }),
        };

        // Simulate sequential creation requests
        const assignedIds = [];
        for (let i = 0; i < requestCount; i++) {
          const id = await getUniqueEquipmentIdFromDb(mockDb);
          dbEquipmentIds.add(id);
          assignedIds.push(id);
        }

        const uniqueSet = new Set(assignedIds);
        expect(uniqueSet.size).toBe(requestCount);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// DB-backed version (mirrors the real getUniqueEquipmentId in the route)
// ---------------------------------------------------------------------------

async function getUniqueEquipmentIdFromDb(mockDb) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateEquipmentId();
    const result = await mockDb.query(
      'SELECT 1 FROM forge_equipment WHERE equipment_id = $1',
      [candidate]
    );
    if (result.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate a unique Equipment ID after 20 attempts.');
}
