# Bugfix Requirements Document

## Introduction

After a full investigation of the FORGE lab system — covering backend routes, database schema, frontend pages, test files, and environment configuration — several real bugs were found that would cause failures at runtime or in the test suite. The existing spec (`lab-system-full-integration`) marks all tasks as complete, but the following defects remain unfixed. This document captures each bug using the bug condition methodology so fixes can be verified systematically.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `useTTS.js` calls the TTS API, THEN the system reads `localStorage.getItem('forge_token')` instead of `localStorage.getItem('token')`, causing every TTS request to be sent without an Authorization header and the backend to return HTTP 401.

1.2 WHEN `backend/routes/admin/equipment.js` uploads an image to S3, THEN the system references `process.env.AWS_S3_BUCKET` which is not defined in `backend/.env` (the actual variable is `S3_BUCKET_NAME`), causing every equipment image upload to fail with an undefined bucket error.

1.3 WHEN `backend/routes/admin/users.js` queries `forge_users`, THEN the system selects the `username` column which does not exist in the `forge_users` schema (the schema has no `username` column), causing the admin user list endpoint to throw a PostgreSQL column-not-found error.

1.4 WHEN `backend/routes/admin/users.js` updates a user's disabled state, THEN the system sets `is_disabled = $1` on `forge_users`, but the `forge_users` schema has no `is_disabled` column, causing the PATCH endpoint to throw a PostgreSQL column-not-found error.

1.5 WHEN `backend/routes/maintenance.js` inserts a row into `forge_maintenance_tickets`, THEN the system passes priority values `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'` (uppercase), but the schema CHECK constraint requires `'Low'`, `'Medium'`, `'High'`, `'Critical'` (title-case), causing every maintenance report submission to fail with a PostgreSQL check constraint violation.

1.6 WHEN `backend/routes/admin/transactions.js` builds a dynamic WHERE clause with the `student` filter, THEN the system uses `$${idx}` twice in the same condition string without incrementing `idx` before the second use, producing a malformed SQL query with a duplicate parameter placeholder that causes a PostgreSQL syntax error.

1.7 WHEN `backend/db/pool.test.js` runs under Vitest with `globals: true`, THEN the system uses bare `describe` and `it` without importing them, and uses `require()` in a file that Vitest treats as ESM, causing the pool test file to fail with a ReferenceError or module resolution error.

1.8 WHEN `frontend/vitest.config.js` runs the `useQRScanner` tests, THEN the environment is set to `'node'` instead of `'jsdom'`, causing `document` and DOM APIs used by the hook and its mock to be undefined, which makes the test suite crash before any assertions run.

---

### Expected Behavior (Correct)

2.1 WHEN `useTTS.js` calls the TTS API, THEN the system SHALL read `localStorage.getItem('token')` (matching the key written by `authService.js`) so that the Authorization header is correctly populated and the backend returns HTTP 200.

2.2 WHEN `backend/routes/admin/equipment.js` uploads an image to S3, THEN the system SHALL reference `process.env.S3_BUCKET_NAME` (the variable defined in `backend/.env`) so that the S3 `PutObjectCommand` receives a valid bucket name.

2.3 WHEN `backend/routes/admin/users.js` queries `forge_users`, THEN the system SHALL NOT select the `username` column; the SELECT list SHALL only include columns that exist in the schema (`user_id`, `student_id`, `full_name`, `program`, `role`, `created_at`).

2.4 WHEN `backend/routes/admin/users.js` needs to enable or disable a user account, THEN the system SHALL use a column that exists in the schema; either the `is_disabled` column SHALL be added to the schema via a migration, or the route SHALL be updated to use an existing status mechanism consistent with the schema.

2.5 WHEN `backend/routes/maintenance.js` inserts a row into `forge_maintenance_tickets`, THEN the system SHALL pass priority values in title-case (`'Low'`, `'Medium'`, `'High'`, `'Critical'`) to satisfy the schema CHECK constraint, so that every maintenance report submission succeeds.

2.6 WHEN `backend/routes/admin/transactions.js` builds a dynamic WHERE clause with the `student` filter, THEN the system SHALL use a single `$${idx++}` placeholder and push one parameter, so that the generated SQL is syntactically valid and executes without error.

2.7 WHEN `backend/db/pool.test.js` runs under Vitest, THEN the system SHALL use ESM-compatible imports (`import { describe, it, expect } from 'vitest'`) and `import` instead of `require`, so that the test file resolves correctly and all three pool tests pass.

2.8 WHEN `frontend/vitest.config.js` runs the `useQRScanner` tests, THEN the environment SHALL be set to `'jsdom'` so that DOM APIs are available and the test suite runs to completion.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `authService.js` stores the JWT after sign-in or sign-up, THEN the system SHALL CONTINUE TO write the token under `localStorage.token` (no change to authService).

3.2 WHEN `BorrowStep3.jsx` and `BorrowStep4.jsx` read the token for API calls, THEN the system SHALL CONTINUE TO use `localStorage.getItem('token')` (these pages are already correct).

3.3 WHEN `backend/routes/auth.js` handles sign-up and sign-in, THEN the system SHALL CONTINUE TO insert and query `forge_users` using only `student_id`, `full_name`, `program`, and `role` columns.

3.4 WHEN `backend/routes/maintenance.js` handles a POST request, THEN the system SHALL CONTINUE TO atomically insert one `forge_maintenance` row and one `forge_maintenance_tickets` row within a single database transaction.

3.5 WHEN `backend/routes/admin/transactions.js` handles a GET request without the `student` query parameter, THEN the system SHALL CONTINUE TO return all transactions without error (the fix must not break the no-filter path).

3.6 WHEN `backend/routes/scanner.js` handles a POST to `/api/scanner/identify`, THEN the system SHALL CONTINUE TO return a `condition` value that is one of `'Excellent'`, `'Good'`, `'Fair'`, `'Poor'`.

3.7 WHEN `backend/routes/transactions.js` handles a POST, THEN the system SHALL CONTINUE TO atomically insert one `forge_transactions` row and N `forge_txn_items` rows and return HTTP 201 with a `txnId`.

3.8 WHEN all backend tests run via `cd backend && npx vitest --run`, THEN the system SHALL CONTINUE TO pass all tests in `auth.test.js`, `scanner.test.js`, `transactions.test.js`, and all `utils/*.test.js` files.

3.9 WHEN all frontend tests run via `cd frontend && npx vitest --run`, THEN the system SHALL CONTINUE TO pass all tests in `useQRScanner.test.js` and `prioritySorting.test.js`.
