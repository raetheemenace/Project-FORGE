# Implementation Plan: lab-system-full-integration

## Overview

All backend routes and frontend pages are substantially implemented. The remaining work is:
1. Fix the maintenance route to atomically create both `forge_maintenance` and `forge_maintenance_tickets` rows
2. Write the missing test suites (auth HTTP integration tests, scanner route tests, QR scanner hook tests, transaction route tests)
3. Verify and wire any remaining gaps between frontend pages and their API endpoints

Tasks are ordered by dependency: backend fixes first, then tests, then any frontend wiring gaps.

## Tasks

- [x] 1. Fix maintenance route atomic insert
  - [x] 1.1 Update `backend/routes/maintenance.js` to atomically insert one `forge_maintenance` row and one `forge_maintenance_tickets` row with `status = 'OPEN'` and `priority` derived from `severity`
    - Use `db.getConnection()` + `BEGIN` / `COMMIT` / `ROLLBACK` pattern (same as transactions.js)
    - Map severity → priority: Low→LOW, Medium→MEDIUM, High→HIGH, Critical→CRITICAL
    - Return `{ reportId, ticketId, message }` with HTTP 201
    - _Requirements: 6.7_
  - [x] 1.2 Write property test for maintenance atomicity
    - **Property 17: Maintenance report atomically creates report and ticket**
    - **Validates: Requirements 6.7**
    - Use `fc.record({ severity: fc.constantFrom('Low','Medium','High','Critical'), description: fc.string({minLength:1}) })` → both row counts increase by exactly 1 or neither does
    - Add to `backend/utils/maintenanceTicketLifecycle.test.js` (file already exists)

- [x] 2. Checkpoint — verify maintenance route
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Write auth route HTTP integration tests
  - [x] 3.1 Create `backend/routes/auth.test.js` with HTTP-level unit tests using Vitest + supertest (or direct route handler calls with mocked `db`)
    - Signup with valid data → HTTP 201, `token` present, `user.studentId` matches input
    - Signup with duplicate `studentId` → HTTP 409, message `"Student ID already registered"`
    - Signup with missing fields → HTTP 400, message `"All fields are required: studentId, fullName, program"`
    - Signup with invalid `studentId` format (not 7 digits) → HTTP 400
    - Signin with valid credentials → HTTP 200, `token` present
    - Signin with wrong credentials → HTTP 401, message `"Invalid credentials"`
    - Signin with missing fields → HTTP 400
    - Request to protected route with no Authorization header → HTTP 401, message `"Access denied. No token provided."`
    - Request to protected route with expired JWT → HTTP 401, message `"Token expired. Please sign in again."`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 2.6_
  - [x] 3.2 Write property test: invalid studentId format always rejected (Property 2)
    - **Property 2: Invalid studentId format is rejected**
    - **Validates: Requirements 1.3**
    - `fc.string().filter(s => !/^\d{7}$/.test(s))` → route always returns HTTP 400
    - Mock `db.query` to avoid real DB calls
  - [x] 3.3 Write property test: missing required signup fields always rejected (Property 3)
    - **Property 3: Missing required signup fields are rejected**
    - **Validates: Requirements 1.4**
    - `fc.subarray(['studentId','fullName','program'], {minLength:1, maxLength:2})` omitted from body → always HTTP 400
  - [x] 3.4 Write property test: non-existent credentials always rejected (Property 5)
    - **Property 5: Non-existent credentials are rejected**
    - **Validates: Requirements 2.2**
    - `fc.record({ fullName: fc.string(), studentId: fc.string() })` not in mocked DB → always HTTP 401

- [x] 4. Write scanner route HTTP integration tests
  - [x] 4.1 Create `backend/routes/scanner.test.js` with Vitest unit tests; mock `BedrockRuntimeClient` and `db`
    - Valid base64 + mocked Bedrock JSON response → HTTP 200, all four fields (`equipmentId`, `name`, `condition`, `confidence`) present
    - Mocked Bedrock returns non-JSON text → HTTP 200, fallback: `{ name: "Unknown Equipment", condition: "Fair", confidence: 0, equipmentId: null }`
    - Mocked Bedrock throws `ThrottlingException` → HTTP 429, message `"Too many scan requests. Please wait 30 seconds and try again."`
    - Mocked Bedrock throws `ValidationException` → HTTP 400, message `"Invalid image format. Please try a different image."`
    - Request without JWT → HTTP 401
    - Request without `imageBase64` field → HTTP 400, message `"imageBase64 is required"`
    - Successful scan → exactly one row inserted into `forge_scan_log` with correct `user_id`, `predicted_name`, `confidence_score`
    - _Requirements: 3.3, 3.4, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 4.2 Write property test: scanner response condition invariant (Property 7)
    - **Property 7: Scanner response schema invariant**
    - **Validates: Requirements 3.4, 5.8**
    - `fc.base64String()` as imageBase64 with mocked Bedrock returning arbitrary JSON → response `condition` is always one of `['Excellent','Good','Fair','Poor']`
    - Comment: `// Feature: lab-system-full-integration, Property 7: Scanner response schema invariant`
  - [x] 4.3 Write property test: successful scan always logs to forge_scan_log (Property 9)
    - **Property 9: Successful scan is logged to forge_scan_log**
    - **Validates: Requirements 3.6, 5.5, 6.9**
    - For any valid input with mocked Bedrock success, `forge_scan_log` insert is called exactly once with matching `user_id`, `predicted_name`, `confidence_score`

- [x] 5. Checkpoint — verify scanner tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write QR scanner hook tests
  - [x] 6.1 Create `frontend/src/test/useQRScanner.test.js` with Vitest + `@testing-library/react`; mock `html5-qrcode`
    - `Html5QrcodeScanner` constructor called with `{ fps: 10, qrbox: { width: 250, height: 250 }, facingMode: 'environment' }` when `startScanner` is invoked
    - `scanner.clear()` called when `stopScanner` is invoked
    - FORGE_EQUIPMENT JSON with valid `equipmentId` → `onScanSuccess` called with that `equipmentId`
    - FORGE_EQUIPMENT JSON missing `equipmentId` → `onScanError` called with `"Invalid QR code format: Missing equipment information"`
    - FORGE_EQUIPMENT JSON missing `type` → `onScanError` called with `"Invalid QR code format: Missing equipment information"`
    - Plain non-JSON non-empty string → `onScanSuccess` called with trimmed string
    - Empty string → `onScanError` called with `"Invalid QR code format: Unable to extract equipment ID"`
    - Whitespace-only string → `onScanError` called with `"Invalid QR code format: Unable to extract equipment ID"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.2 Write property test: FORGE_EQUIPMENT JSON always triggers success callback (Property 10)
    - **Property 10: QR FORGE_EQUIPMENT JSON triggers success callback**
    - **Validates: Requirements 4.2**
    - `fc.string({ minLength: 1 })` as `equipmentId` → `JSON.stringify({ type: 'FORGE_EQUIPMENT', equipmentId })` decoded → `onScanSuccess` called with that exact `equipmentId`
    - Comment: `// Feature: lab-system-full-integration, Property 10: QR FORGE_EQUIPMENT JSON triggers success callback`
  - [x] 6.3 Write property test: non-JSON QR payload triggers success with trimmed text (Property 11)
    - **Property 11: Non-JSON QR payload triggers success callback with trimmed text**
    - **Validates: Requirements 4.3**
    - `fc.string({ minLength: 1 }).filter(s => { try { JSON.parse(s); return false; } catch { return true; } })` → `onScanSuccess` called with `s.trim()`
    - Comment: `// Feature: lab-system-full-integration, Property 11: Non-JSON QR payload triggers success callback with trimmed text`
  - [x] 6.4 Write property test: invalid JSON QR payload triggers error callback (Property 12)
    - **Property 12: Invalid JSON QR payload triggers error callback**
    - **Validates: Requirements 4.4**
    - `fc.record({ someKey: fc.string() })` (JSON missing `type` and `equipmentId`) → `onScanError` called with `"Invalid QR code format: Missing equipment information"`
    - Comment: `// Feature: lab-system-full-integration, Property 12: Invalid JSON QR payload triggers error callback`
  - [x] 6.5 Write property test: whitespace QR payload triggers error callback (Property 13)
    - **Property 13: Whitespace QR payload triggers error callback**
    - **Validates: Requirements 4.5**
    - `fc.string().map(s => s.replace(/\S/g, ' '))` (whitespace-only) → `onScanError` called with `"Invalid QR code format: Unable to extract equipment ID"`
    - Comment: `// Feature: lab-system-full-integration, Property 13: Whitespace QR payload triggers error callback`

- [x] 7. Write transaction route tests
  - [x] 7.1 Create `backend/routes/transactions.test.js` with Vitest; mock `db`
    - POST with valid body (N items) → HTTP 201, `txnId` present, `forge_transactions` insert called once, `forge_txn_items` insert called N times
    - POST with missing session fields → HTTP 400, message `"All session fields are required."`
    - POST with empty `items` array → HTTP 400, message `"At least one equipment item is required."`
    - POST without JWT → HTTP 401
    - GET → returns `{ transactions: [...] }` for authenticated user, ordered by `txn_date DESC`
    - GET without JWT → HTTP 401
    - _Requirements: 6.1, 6.2_
  - [x] 7.2 Write property test: transaction creation is atomic (Property 14)
    - **Property 14: Transaction creation is atomic**
    - **Validates: Requirements 6.1**
    - `fc.array(fc.record({ equipmentId: fc.string(), condition: fc.constantFrom('Excellent','Good','Fair','Poor') }), { minLength: 1, maxLength: 10 })` → exactly 1 `forge_transactions` row and exactly N `forge_txn_items` rows inserted
    - Comment: `// Feature: lab-system-full-integration, Property 14: Transaction creation is atomic`
  - [x] 7.3 Write property test: transaction list is complete and ordered (Property 15)
    - **Property 15: Transaction list is complete and ordered**
    - **Validates: Requirements 6.2**
    - For any array of N mocked transactions ordered by `txn_date DESC`, GET returns exactly N rows in that order
    - Comment: `// Feature: lab-system-full-integration, Property 15: Transaction list is complete and ordered`

- [x] 8. Checkpoint — verify all test suites pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Verify authService localStorage key alignment
  - [x] 9.1 Confirm `frontend/src/services/authService.js` stores JWT under `localStorage.token` (not `forge_token`)
    - `BorrowStep3.jsx` reads `localStorage.getItem('forge_token')` — update either `authService.js` (store under `forge_token`) or `BorrowStep3.jsx` (read `token`) so both sides use the same key
    - Also check `MyTransactions.jsx` and any other page that reads the token directly
    - _Requirements: 1.5, 2.4_

- [x] 10. Final checkpoint — end-to-end wiring verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The codebase is substantially complete; most tasks are test coverage and one bug fix (maintenance atomicity)
- Property tests use fast-check with minimum 100 iterations per property
- Each property test must include a comment: `// Feature: lab-system-full-integration, Property N: <property_text>`
- Run backend tests: `cd backend && npx vitest --run`
- Run frontend tests: `cd frontend && npx vitest --run`
