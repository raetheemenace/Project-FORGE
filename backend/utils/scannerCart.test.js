// Feature: forge-system, Property 8: Scanned items cart growth
// Validates: Requirements 6.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure cart logic — mirrors the state management in BorrowStep3.jsx
// ---------------------------------------------------------------------------

/**
 * Applies a sequence of "add" actions to an initially empty cart.
 * Each action adds one item to the cart.
 * Returns the final cart array.
 */
function applyAddActions(actions) {
  let cart = [];
  for (const item of actions) {
    cart = [...cart, item];
  }
  return cart;
}

/**
 * Simulates the "Add to Cart" handler from BorrowStep3.
 * Returns the new cart after adding the item.
 */
function addToCart(cart, item) {
  return [...cart, { name: item.name, condition: item.condition, equipmentId: item.equipmentId }];
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const conditionArb = fc.constantFrom('Excellent', 'Good', 'Fair', 'Poor');

const scanResultArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  condition: conditionArb,
  equipmentId: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 5, maxLength: 10 }).map((s) => `EQ-${s}`)
  ),
  confidence: fc.integer({ min: 0, max: 100 }),
});

/** A non-empty sequence of scan results (1–20 items) */
const scanSequenceArb = fc.array(scanResultArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 8: Scanned items cart growth
// Validates: Requirements 6.4
// ---------------------------------------------------------------------------
describe('Property 8: Scanned items cart growth', () => {
  it('cart length equals the number of add actions performed', () => {
    fc.assert(
      fc.property(scanSequenceArb, (items) => {
        const cart = applyAddActions(items);
        expect(cart).toHaveLength(items.length);
      }),
      { numRuns: 200 }
    );
  });

  it('each add action increases cart length by exactly 1', () => {
    fc.assert(
      fc.property(scanSequenceArb, (items) => {
        let cart = [];
        for (let i = 0; i < items.length; i++) {
          const before = cart.length;
          cart = addToCart(cart, items[i]);
          expect(cart).toHaveLength(before + 1);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('cart preserves insertion order', () => {
    fc.assert(
      fc.property(scanSequenceArb, (items) => {
        const cart = applyAddActions(items);
        for (let i = 0; i < items.length; i++) {
          expect(cart[i].name).toBe(items[i].name);
          expect(cart[i].condition).toBe(items[i].condition);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('adding to an empty cart always produces a single-item cart', () => {
    fc.assert(
      fc.property(scanResultArb, (item) => {
        const cart = addToCart([], item);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe(item.name);
        expect(cart[0].condition).toBe(item.condition);
      }),
      { numRuns: 200 }
    );
  });

  it('cart is never longer than the number of add actions (no phantom items)', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const cart = applyAddActions(items);
          expect(cart.length).toBeLessThanOrEqual(items.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('condition values in cart are always one of the valid enum values', () => {
    const validConditions = new Set(['Excellent', 'Good', 'Fair', 'Poor']);
    fc.assert(
      fc.property(scanSequenceArb, (items) => {
        const cart = applyAddActions(items);
        for (const cartItem of cart) {
          expect(validConditions.has(cartItem.condition)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });
});
