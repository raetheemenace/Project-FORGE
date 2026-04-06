# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - QR Scanner Camera Fails to Render on Mobile
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases to ensure reproducibility
  - Write tests in `frontend/src/test/bugConditionExploration.test.jsx`
  - Test 1 — Race Condition: simulate `toggleQrMode` calling `stopCamera()` then `startScanner` after only 100ms; assert `Html5QrcodeScanner.render()` is NOT called before the stream is released (will FAIL on unfixed code — 100ms is too short)
  - Test 2 — Hard facingMode Constraint: inspect the config passed to `Html5QrcodeScanner` constructor; assert it does NOT use a hard `facingMode: 'environment'` top-level key (will FAIL on unfixed code — hard constraint is present)
  - Test 3 — Zero-Height Container: simulate `startScanner` being called when `document.getElementById('qr-scanner-container')?.offsetHeight === 0`; assert `.render()` is not called until height is non-zero (will FAIL on unfixed code — no height check exists)
  - Test 4 — Container min-height: assert the `qr-scanner-container` div has `min-h-[300px]` in its className (will FAIL on unfixed code — class is absent)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., "render() called 100ms after stopCamera() while stream still active", "config has facingMode: 'environment' as hard constraint")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - QR Decode Logic and Desktop Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Write tests in `frontend/src/test/preservationProperties.test.jsx`
  - Observe on UNFIXED code: `onScanSuccess` is called with `equipmentId` for valid FORGE_EQUIPMENT JSON
  - Observe on UNFIXED code: `onScanSuccess` is called with trimmed text for plain-text QR payloads
  - Observe on UNFIXED code: `onScanError` is called with the correct message for invalid/missing-field JSON
  - Observe on UNFIXED code: `onScanError` is called with the correct message for whitespace-only payloads
  - Write property-based test (fast-check): for all non-empty `equipmentId` strings, scanning `{"type":"FORGE_EQUIPMENT","equipmentId":"..."}` always calls `onScanSuccess` with that `equipmentId`
  - Write property-based test (fast-check): for all non-JSON, non-empty, non-whitespace strings, scanning them always calls `onScanSuccess` with the trimmed value
  - Write property-based test (fast-check): for all JSON objects missing `type` or `equipmentId`, scanning them always calls `onScanError` with `'Invalid QR code format: Missing equipment information'`
  - Write property-based test (fast-check): for all whitespace-only strings, scanning them always calls `onScanError` with `'Invalid QR code format: Unable to extract equipment ID'`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix QR scanner mobile camera rendering

  - [x] 3.1 Soften facingMode constraint in useQRScanner.js
    - In `frontend/src/hooks/useQRScanner.js`, inside `startScanner`, remove `facingMode: 'environment'` from the top-level `Html5QrcodeScanner` config object
    - Add `videoConstraints: { facingMode: { ideal: 'environment' } }` to the config object so the library falls back to any available camera if the back camera cannot be satisfied
    - Do NOT change the `scanner.render()` success/error callbacks — decode logic must remain identical
    - _Bug_Condition: isBugCondition(input) where facingModeConstraintUnsatisfiable() is true (hard 'environment' constraint fails on front-camera-only or some Android devices)_
    - _Expected_Behavior: Html5QrcodeScanner config uses videoConstraints.facingMode.ideal = 'environment' (soft preference), allowing fallback to any camera_
    - _Preservation: scanner.render() callbacks (FORGE_EQUIPMENT JSON parsing, plain-text fallback, error filtering) must remain completely unchanged_
    - _Requirements: 2.3, 3.2, 3.3, 3.4_

  - [x] 3.2 Add release delay in toggleQrMode in BorrowStep3.jsx
    - In `frontend/src/pages/borrow/BorrowStep3.jsx`, convert `toggleQrMode` to an `async function`
    - After calling `stopCamera()` and before `setQrMode(true)`, insert `await new Promise(resolve => setTimeout(resolve, 400))` to give iOS Safari and Android Chrome sufficient time to fully release the getUserMedia hardware stream
    - _Bug_Condition: isBugCondition(input) where NOT input.streamReleased (race condition: stream not yet released when html5-qrcode requests camera)_
    - _Expected_Behavior: Html5QrcodeScanner.render() is called only after the previous stream is fully released (≥400ms after stopCamera())_
    - _Preservation: closing the QR scanner (qrMode=true → false branch) must still call stopScanner() and restart the AI camera stream without regression_
    - _Requirements: 2.2, 3.5, 3.6_

  - [x] 3.3 Increase DOM-readiness delay in BorrowStep3.jsx useEffect
    - In `frontend/src/pages/borrow/BorrowStep3.jsx`, in the `useEffect` that calls `startScanner`, replace the 100ms `setTimeout` with either:
      - A 300ms delay: `setTimeout(() => startScanner('qr-scanner-container'), 300)`, OR
      - A `requestAnimationFrame`-based polling loop that checks `document.getElementById('qr-scanner-container')?.offsetHeight > 0` before calling `startScanner`, with a maximum retry count (e.g., 20 retries × 50ms = 1s max) to avoid infinite loops
    - _Bug_Condition: isBugCondition(input) where delayTooShort(input.delayMs, 100) is true (100ms insufficient for DOM layout on mobile)_
    - _Expected_Behavior: startScanner is called only after the container div has a non-zero offsetHeight_
    - _Requirements: 2.4_

  - [x] 3.4 Add min-h-[300px] to qr-scanner-container div in BorrowStep3.jsx
    - In `frontend/src/pages/borrow/BorrowStep3.jsx`, change `<div id="qr-scanner-container" className="w-full" />` to `<div id="qr-scanner-container" className="w-full min-h-[300px]" />`
    - This ensures html5-qrcode always has a rendered container with non-zero dimensions to inject its UI into on mobile
    - _Bug_Condition: isBugCondition(input) where input.containerHeight = 0 (container collapses to zero height before library injects UI)_
    - _Expected_Behavior: container div has offsetHeight > 0 when Html5QrcodeScanner.render() is called_
    - _Requirements: 2.5_

  - [x] 3.5 Write fix-checking tests
    - Write tests in `frontend/src/test/fixChecking.test.js`
    - Test that `Html5QrcodeScanner` config uses `videoConstraints: { facingMode: { ideal: 'environment' } }` and does NOT have a top-level `facingMode` key
    - Test that `toggleQrMode` awaits at least 300ms after `stopCamera()` before `Html5QrcodeScanner` constructor is called
    - Test that `startScanner` is not called until the container div has `offsetHeight > 0`
    - Test that the `qr-scanner-container` div has `min-h-[300px]` in its className
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - QR Scanner Camera Renders on Mobile
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from `frontend/src/test/bugConditionExploration.test.jsx`
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - QR Decode Logic and Desktop Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from `frontend/src/test/preservationProperties.test.jsx`
    - Run existing useQRScanner unit tests from `frontend/src/test/useQRScanner.test.js` — all must continue to pass
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in decode logic or desktop behavior)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full frontend test suite: `cd frontend && npx vitest --run`
  - Verify `bugConditionExploration.test.jsx` passes
  - Verify `preservationProperties.test.jsx` passes
  - Verify `fixChecking.test.js` passes
  - Verify `useQRScanner.test.js` passes (all existing tests unchanged)
  - Ensure all tests pass; ask the user if questions arise
