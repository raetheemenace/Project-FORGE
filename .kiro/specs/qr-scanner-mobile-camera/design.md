# QR Scanner Mobile Camera Bugfix Design

## Overview

On mobile devices (iOS Safari, Android Chrome), the QR scanner camera fails to appear when the user taps the QR toggle button in BorrowStep3. The fix addresses four compounding root causes: a race condition between releasing the existing `getUserMedia` stream and requesting a new one, a hard `facingMode: 'environment'` constraint that fails silently, an insufficient 100ms DOM-readiness delay, and a missing minimum height on the scanner container div.

The fix is minimal and targeted: add a release delay in `toggleQrMode`, soften the `facingMode` constraint in `useQRScanner.js`, increase or replace the DOM-readiness delay in BorrowStep3, and add a `min-h` class to the container div. All existing QR decode logic and desktop behavior must remain unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a mobile user taps the QR toggle button and the camera UI fails to render inside the scanner container
- **Property (P)**: The desired behavior when the bug condition holds — a functional camera viewfinder appears inside the QR scanner container within a reasonable time
- **Preservation**: Existing QR decode logic (FORGE_EQUIPMENT JSON, plain-text fallback, error handling) and desktop behavior that must remain unchanged by the fix
- **toggleQrMode**: The function in `BorrowStep3.jsx` that switches between AI camera mode and QR scanner mode
- **startScanner**: The function from `useQRScanner.js` that instantiates `Html5QrcodeScanner` and calls `.render()` on a given DOM element ID
- **stopCamera**: The function in `BorrowStep3.jsx` that stops all `getUserMedia` tracks and clears `streamRef`
- **qrMode**: The boolean state in `BorrowStep3.jsx` that determines whether the QR scanner panel is shown
- **isBugCondition**: Pseudocode predicate identifying inputs that trigger the bug

## Bug Details

### Bug Condition

The bug manifests when a mobile user taps the QR toggle button in BorrowStep3. The `toggleQrMode` function calls `stopCamera()` to release the `getUserMedia` stream, then immediately sets `qrMode = true`, which triggers a `useEffect` that calls `startScanner` after only 100ms. On mobile browsers, the stream may not be fully released, the container div may have zero height, and the `facingMode: 'environment'` hard constraint may be unsatisfiable — any one of these causes `html5-qrcode` to silently fail to display the camera UI.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { device: DeviceType, action: UserAction, containerHeight: number, streamReleased: boolean }
  OUTPUT: boolean

  RETURN input.device IN ['mobile-ios', 'mobile-android']
         AND input.action = 'QR_TOGGLE_TAPPED'
         AND (
           NOT input.streamReleased                  -- race condition: stream not yet released
           OR input.containerHeight = 0              -- container has no layout height
           OR facingModeConstraintUnsatisfiable()    -- hard environment constraint fails
           OR delayTooShort(input.delayMs, 100)      -- 100ms insufficient for DOM readiness
         )
END FUNCTION
```

### Examples

- Mobile user taps QR toggle → `stopCamera()` runs → `html5-qrcode` requests camera 80ms later → iOS Safari denies second request → blank scanner panel (race condition)
- Android device with front-camera-only → `facingMode: 'environment'` hard constraint → `html5-qrcode` silently fails → no camera UI shown
- Low-end Android phone → container div renders but has `height: 0` at 100ms → `Html5QrcodeScanner.render()` called on zero-height element → library silently aborts
- Desktop user taps QR toggle → stream releases instantly, container has height, `facingMode: 'environment'` satisfiable → scanner works (not a bug condition)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse/tap clicks on the AI Scan Equipment button must continue to work exactly as before
- FORGE_EQUIPMENT JSON QR decode logic must remain unchanged — `onScanSuccess` called with `equipmentId`
- Plain-text QR decode fallback must remain unchanged — `onScanSuccess` called with trimmed text
- Invalid QR code error handling must remain unchanged — `onScanError` called with appropriate message
- Closing the QR scanner must still call `stopScanner()` and restart the AI camera stream
- Desktop QR scanning behavior must be completely unaffected

**Scope:**
All inputs that do NOT involve a mobile device tapping the QR toggle button should be completely unaffected by this fix. This includes:
- Desktop users opening the QR scanner
- Any user scanning a valid or invalid QR code (decode logic is untouched)
- Any user using the AI camera scanner (non-QR mode)
- Any user closing the QR scanner and returning to AI mode

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Race Condition in toggleQrMode**: `stopCamera()` calls `track.stop()` on all `getUserMedia` tracks, but the browser (especially iOS Safari) does not immediately release the hardware camera. `html5-qrcode` then requests the camera ~100ms later, and the browser denies or silently drops the request because the previous stream is still being torn down.
   - `toggleQrMode` calls `stopCamera()` then synchronously sets `qrMode = true`
   - The `useEffect` fires and calls `startScanner` after only 100ms
   - iOS Safari requires ~300–500ms to fully release the camera hardware

2. **Hard facingMode Constraint**: `useQRScanner.js` passes `facingMode: 'environment'` directly in the `Html5QrcodeScanner` config object. This is treated as a hard `getUserMedia` constraint on some library versions, causing silent failure on devices where the back camera is unavailable or the constraint cannot be satisfied (e.g., front-camera-only devices, some Android configurations).

3. **Insufficient DOM-Readiness Delay**: The 100ms `setTimeout` in the `useEffect` is too short on mobile. The container div may be in the DOM but have `offsetHeight === 0` because layout has not completed. `html5-qrcode` checks the container dimensions before injecting its UI and silently aborts if the height is zero.

4. **Missing Minimum Height on Container**: The `<div id="qr-scanner-container">` has no explicit height or `min-h` class. On mobile, before `html5-qrcode` injects its UI, the div collapses to zero height. The library requires a rendered container with non-zero dimensions to initialize correctly.

## Correctness Properties

Property 1: Bug Condition - QR Scanner Camera Renders on Mobile

_For any_ input where the bug condition holds (isBugCondition returns true) — a mobile user taps the QR toggle button — the fixed `toggleQrMode` and `startScanner` SHALL ensure the previous camera stream is fully released, the container has non-zero layout height, and `Html5QrcodeScanner.render()` is called with a soft camera preference, resulting in a functional camera viewfinder appearing inside the QR scanner container.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - QR Decode Logic and Desktop Behavior Unchanged

_For any_ input where the bug condition does NOT hold (isBugCondition returns false) — desktop users, non-QR-toggle interactions, or any QR code scan event — the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing QR decode logic (FORGE_EQUIPMENT JSON parsing, plain-text fallback, error handling) and desktop camera behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/borrow/BorrowStep3.jsx`

**Function**: `toggleQrMode`

**Specific Changes**:

1. **Add release delay before setting qrMode**: Convert `toggleQrMode` to an async function. After calling `stopCamera()`, await a 400ms delay before setting `qrMode = true`. This gives iOS Safari and Android Chrome sufficient time to fully release the `getUserMedia` hardware stream before `html5-qrcode` requests it.
   - Change `function toggleQrMode()` to `async function toggleQrMode()`
   - Insert `await new Promise(resolve => setTimeout(resolve, 400))` after `stopCamera()` and before `setQrMode(true)`

2. **Increase DOM-readiness delay**: In the `useEffect` that calls `startScanner`, increase the `setTimeout` delay from 100ms to 300ms. Alternatively, use a `requestAnimationFrame`-based polling loop that checks `document.getElementById('qr-scanner-container')?.offsetHeight > 0` before calling `startScanner`, with a maximum retry count to avoid infinite loops.
   - Replace `setTimeout(() => startScanner('qr-scanner-container'), 100)` with a 300ms delay or a DOM-polling approach

3. **Add minimum height to container div**: Add `min-h-[300px]` to the `<div id="qr-scanner-container">` className so `html5-qrcode` always has a rendered container with non-zero dimensions to inject its UI into.
   - Change `<div id="qr-scanner-container" className="w-full" />` to `<div id="qr-scanner-container" className="w-full min-h-[300px]" />`

**File**: `frontend/src/hooks/useQRScanner.js`

**Function**: `startScanner`

**Specific Changes**:

4. **Soften facingMode constraint**: Remove `facingMode: 'environment'` from the top-level `Html5QrcodeScanner` config object. Instead, pass it as a soft preference via `videoConstraints: { facingMode: { ideal: 'environment' } }`. This allows the library to fall back to any available camera if the back camera cannot be satisfied, rather than failing silently.
   - Remove `facingMode: 'environment'` from the config object
   - Add `videoConstraints: { facingMode: { ideal: 'environment' } }` to the config object

5. **No changes to decode logic**: The `scanner.render()` success and error callbacks — including FORGE_EQUIPMENT JSON parsing, plain-text fallback, and error filtering — must remain completely unchanged.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the `toggleQrMode` sequence — calling `stopCamera()` then immediately calling `startScanner` after 100ms — and assert that `Html5QrcodeScanner` is instantiated and `.render()` is called. Also verify the container has non-zero height before `render()` is invoked. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Race Condition Test**: Simulate `toggleQrMode` on a mock mobile environment — verify that `Html5QrcodeScanner` constructor is called after the stream is released (will fail on unfixed code due to 100ms delay being too short)
2. **Container Height Test**: Simulate `startScanner` being called when `offsetHeight === 0` — verify the scanner does not call `.render()` until height is non-zero (will fail on unfixed code)
3. **facingMode Config Test**: Inspect the config passed to `Html5QrcodeScanner` constructor — verify `facingMode: 'environment'` is a hard constraint (will demonstrate the bug on unfixed code)
4. **Zero-Height Container Test**: Simulate `Html5QrcodeScanner.render()` being called on a zero-height container — verify it fails silently (demonstrates the bug condition)

**Expected Counterexamples**:
- `Html5QrcodeScanner` constructor is called before the previous stream is fully released
- `Html5QrcodeScanner.render()` is called when `offsetHeight === 0`
- Possible causes: insufficient delay, hard facingMode constraint, missing min-height

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := toggleQrMode_fixed(input)
  ASSERT Html5QrcodeScanner.render() called AFTER stream released
  ASSERT container.offsetHeight > 0 WHEN render() is called
  ASSERT Html5QrcodeScanner config uses videoConstraints.facingMode.ideal (not hard constraint)
  ASSERT camera viewfinder appears in container
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT useQRScanner_original(input) = useQRScanner_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that decode behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe decode behavior on UNFIXED code first for FORGE_EQUIPMENT JSON, plain-text, and invalid QR inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **FORGE_EQUIPMENT JSON Preservation**: Verify that scanning a valid `{"type":"FORGE_EQUIPMENT","equipmentId":"EQ-001"}` QR code still calls `onScanSuccess("EQ-001")` after the fix
2. **Plain-Text QR Preservation**: Verify that scanning a plain-text QR code (e.g., `"EQ-042"`) still calls `onScanSuccess("EQ-042")` after the fix
3. **Invalid QR Preservation**: Verify that scanning an invalid QR code still calls `onScanError` with the appropriate message after the fix
4. **Desktop Toggle Preservation**: Verify that `toggleQrMode` on a desktop environment still starts the scanner without the extra delay causing issues

### Unit Tests

- Test that `toggleQrMode` awaits at least 300ms after `stopCamera()` before setting `qrMode = true`
- Test that `startScanner` is not called until the container div has `offsetHeight > 0`
- Test that the `Html5QrcodeScanner` config uses `videoConstraints: { facingMode: { ideal: 'environment' } }` instead of a hard `facingMode` constraint
- Test that the `qr-scanner-container` div has `min-h-[300px]` in its className

### Property-Based Tests

- Generate random valid FORGE_EQUIPMENT JSON payloads and verify `onScanSuccess` is always called with the correct `equipmentId` (unchanged decode logic)
- Generate random plain-text strings and verify `onScanSuccess` is always called with the trimmed value (unchanged fallback logic)
- Generate random invalid payloads (non-JSON, JSON without `type`, JSON without `equipmentId`) and verify `onScanError` is always called (unchanged error handling)
- Generate random sequences of `toggleQrMode` calls and verify the scanner always initializes after a sufficient delay

### Integration Tests

- Test full QR toggle flow on a simulated mobile environment: tap toggle → verify delay → verify container height → verify scanner renders
- Test switching between AI camera mode and QR mode multiple times in sequence without camera stream conflicts
- Test that closing the QR scanner (tapping toggle again) correctly calls `stopScanner()` and restarts the AI camera stream
