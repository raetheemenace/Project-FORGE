/**
 * Vitest global setup — runs before each test file.
 *
 * Makes window.location mockable for tests that use:
 *   delete window.location;
 *   window.location = { pathname: '/foo', href: 'http://localhost/foo', ... };
 *
 * Strategy: patch window.location as a NON-configurable accessor so that
 * `delete window.location` fails silently (returns false) and the property
 * stays in place. Then `window.location = {...}` goes through our setter,
 * which stores the mock in a shared store. We also patch document.defaultView.location
 * to read from the same shared store (since BrowserRouter uses document.defaultView).
 */

// Patch document.defaultView.location to read from shared mock store
const dv = document.defaultView;
if (dv) {
  const dvDesc = Object.getOwnPropertyDescriptor(dv, 'location');
  if (dvDesc && dvDesc.get) {
    const origGet = dvDesc.get;
    Object.defineProperty(dv, 'location', {
      configurable: true,
      enumerable: true,
      get() {
        if (globalThis.__locationMock__ !== undefined) return globalThis.__locationMock__;
        return origGet.call(this);
      },
    });
  }
}

// Patch window.location as a non-configurable accessor so delete fails silently
// and assignments go through our setter
const winDesc = Object.getOwnPropertyDescriptor(window, 'location');
if (winDesc) {
  const origGet = winDesc.get;
  const origSet = winDesc.set;
  Object.defineProperty(window, 'location', {
    configurable: false,  // <-- non-configurable: delete returns false, property stays
    enumerable: true,
    get() {
      if (globalThis.__locationMock__ !== undefined) return globalThis.__locationMock__;
      return origGet ? origGet.call(this) : undefined;
    },
    set(value) {
      if (value && typeof value === 'object') {
        globalThis.__locationMock__ = value;
      } else if (origSet) {
        origSet.call(this, value);
      }
    },
  });
}

// Clean up mock after each test
afterEach(() => {
  globalThis.__locationMock__ = undefined;
});
