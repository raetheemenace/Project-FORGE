# Implementation Plan: Lab Assistant Lab-Specific Availability & Inventory Acquisition Workflow

## Overview

Implement two features for the FORGE system: (1) extend the AI Lab Assistant's live context with per-room equipment availability so it can answer room-scoped queries, and (2) add a full Inventory Acquisition workflow with DB tables, backend routes, and an admin frontend page.

All code is JavaScript (Node.js / Express backend, React + Vite frontend). Property-based tests use `fast-check` via Vitest.

## Tasks

- [x] 1. Add DB migration SQL for acquisition tables
  - Write `forge_acquisitions` and `forge_acquisition_items` CREATE TABLE statements with indexes, matching the schema in the design document
  - Append the migration to `backend/db/schema.sql` (or a new `backend/db/migrations/001_acquisitions.sql`)
  - _Requirements: 3.1, 4.1, 4.2_

- [x] 2. Extract `buildRoomContext()` and extend `fetchLiveContext()` in `backend/routes/ai.js`
  - [x] 2.1 Extract pure `buildRoomContext(rooms, roomEquipment)` helper
    - Accept the raw query result rows (rooms array, per-room equipment/booking rows) as parameters
    - Return the formatted `## Live Per-Room Equipment Availability` context string with available/booked lists and the per-room summary table
    - Export `buildRoomContext` so it can be imported by tests
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3_

  - [x] 2.2 Add the fourth parallel DB query inside `fetchLiveContext()`
    - Add the per-room availability query (joining `forge_lab_rooms`, `forge_equipment_events`, `forge_equipment`, `forge_txn_items`, `forge_transactions`, `forge_users`) to the existing `Promise.all` block
    - Call `buildRoomContext()` with the query results and append the returned string to the existing context
    - Ensure the `catch` block still returns `''` on any DB failure (graceful degradation)
    - _Requirements: 1.5, 1.6, 1.7, 2.3_

  - [x] 2.3 Write property tests for `buildRoomContext()` — Properties 1, 2, 12
    - **Property 1: Per-Room Context Completeness** — for any set of rooms and equipment assignments, `buildRoomContext()` must include the correct available count and equipment names for each room
    - **Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.3**
    - **Property 2: Booked Equipment Excluded from Available List** — for any equipment with an active booking today, it must appear under "Booked" and not under "Available" in its room's section
    - **Validates: Requirements 1.3, 1.6**
    - **Property 12: Acquisition Item Immediately Visible in Live Context** — after an acquisition is committed, `buildRoomContext()` called with updated rows must include the new equipment ID in the available list for its assigned room
    - **Validates: Requirements 7.3**
    - Test file: `backend/utils/labRoomContext.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 1/2/12`
    - Use `fc.array` of room/equipment/booking arbitraries; minimum 100 runs per property

- [x] 3. Create `backend/routes/admin/acquisitions.js` with all four endpoints
  - [x] 3.1 Implement `GET /api/admin/acquisitions` — list all acquisitions
    - Query `forge_acquisitions` joined with `forge_users` (creator name) and a COUNT subquery for item count
    - Order by `acquisition_date DESC`
    - Return array of `{ acquisition_id, supplier_name, acquisition_date, notes, item_count, created_by_name }`
    - Require `authenticateToken` + `requireRole('LAB_ADMIN')`
    - _Requirements: 5.1, 5.4_

  - [x] 3.2 Implement `POST /api/admin/acquisitions` — create acquisition record
    - Validate `supplier_name` (non-empty) and `acquisition_date` (present); return 400 with descriptive message on failure
    - INSERT into `forge_acquisitions` with `created_by = req.user.userId`
    - INSERT into `forge_admin_actions` with `action_type = 'ACQUISITION_CREATED'`, `target_type = 'ACQUISITION'`, `target_id = acquisitionId`
    - Return `{ acquisitionId }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Implement `GET /api/admin/acquisitions/:id` — acquisition detail
    - Fetch acquisition metadata from `forge_acquisitions` joined with creator name
    - Fetch all items from `forge_acquisition_items` joined with `forge_equipment` (equipment_id, name, department, status)
    - Return 404 with `{ error: "Acquisition not found." }` if ID does not exist
    - Return `{ acquisition, items: [...] }`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 3.4 Implement `POST /api/admin/acquisitions/:id/items` — batch add items
    - Validate `acquisition_id` exists; return 404 if not
    - Validate each item has non-empty `name` and `department`; return 400 on failure
    - For each item in the request array, within a single `BEGIN`/`COMMIT` transaction:
      - Generate unique Equipment ID via `getUniqueEquipmentId(client)` (imported from `./equipment`)
      - INSERT into `forge_equipment` with `status = 'AVAILABLE'`
      - INSERT into `forge_acquisition_items` linking equipment to acquisition with `initial_condition` and `assigned_room`
      - INSERT into `forge_equipment_events` with `event_type = 'PROCURED'`, `performed_by = req.user.userId`, `to_location = assigned_room`
    - On any failure, ROLLBACK and return 500 with `{ error: "Failed to add items. No changes were saved." }`
    - Return `{ equipmentIds: [...] }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.5 Write property tests for acquisition creation round-trip — Properties 3, 4
    - **Property 3: Acquisition Creation Round-Trip** — for any valid supplier name and date, simulating create then retrieve must yield the same supplier name, date, notes, and creator ID
    - **Validates: Requirements 3.1, 3.3, 3.5**
    - **Property 4: Acquisition Creation Audit Log Invariant** — for any successfully created acquisition, the simulated `forge_admin_actions` insert must contain exactly one row with `action_type = 'ACQUISITION_CREATED'` and matching `target_id`
    - **Validates: Requirements 3.4, 7.2**
    - Test file: `backend/utils/acquisitionRoundTrip.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 3/4`
    - Use pure builder functions extracted from the route logic; minimum 100 runs

  - [x] 3.6 Write property tests for acquisition item creation — Properties 5, 6
    - **Property 5: Acquisition Item Creation Round-Trip** — for any valid item, the simulated `forge_equipment` row must have `status = 'AVAILABLE'` and an ID matching `EQ-XXXX` format, and `forge_acquisition_items` must link it to the acquisition
    - **Validates: Requirements 4.1, 4.2**
    - **Property 6: PROCURED Event Invariant** — for any item created via acquisition, the simulated `forge_equipment_events` row must have `event_type = 'PROCURED'`, `to_location = assigned_room`, and `performed_by = adminUserId`
    - **Validates: Requirements 4.3, 7.1**
    - Test file: `backend/utils/acquisitionItemRoundTrip.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 5/6`
    - Minimum 100 runs

  - [x] 3.7 Write property tests for batch add — Properties 7, 8
    - **Property 7: Batch Add Completeness** — for any batch of N valid items, the simulated response must contain exactly N equipment IDs and exactly N rows in both `forge_equipment` and `forge_acquisition_items`
    - **Validates: Requirements 4.6**
    - **Property 8: Batch Add Atomicity** — for any batch where one item insert fails at a random position, no equipment records, acquisition item records, or equipment event records from that batch must be committed (simulate ROLLBACK)
    - **Validates: Requirements 4.7**
    - Test file: `backend/utils/acquisitionBatch.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 7/8`
    - Use `fc.array(itemArb, { minLength: 1, maxLength: 20 })` and `fc.integer` for failure position; minimum 100 runs

  - [x] 3.8 Write property tests for list ordering and detail round-trip — Properties 9, 10
    - **Property 9: Acquisitions List Ordering** — for any set of acquisition records with distinct dates, the simulated list must be ordered by `acquisition_date` descending and each record must include supplier name, date, item count, and creator name
    - **Validates: Requirements 5.1**
    - **Property 10: Acquisition Detail Round-Trip** — for any acquisition with a known set of items, the set of equipment IDs from the detail response must equal the set of equipment IDs in the simulated `forge_equipment_events` PROCURED rows for that acquisition
    - **Validates: Requirements 5.2, 7.4**
    - Test file: `backend/utils/acquisitionList.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 9/10`
    - Minimum 100 runs

  - [x] 3.9 Write property tests for auth enforcement — Property 11
    - **Property 11: Acquisition Endpoints Require LAB_ADMIN Role** — for any request to any acquisition endpoint with a missing token, student-role token, or expired token, the system must return a 4xx status and must not return or modify any acquisition data
    - **Validates: Requirements 5.4**
    - Test file: `backend/utils/acquisitionAuth.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 11`
    - Use `fc.constantFrom` over token scenarios (missing, student role, expired); minimum 100 runs

  - [x] 3.10 Write property tests for input validation — Properties 13, 14
    - **Property 13: Validation Rejects Missing Acquisition Fields** — for any acquisition creation request where supplier name is empty/whitespace or acquisition date is absent, the system must return HTTP 400 and must not create any record in `forge_acquisitions` or `forge_admin_actions`
    - **Validates: Requirements 3.2**
    - **Property 14: Validation Rejects Missing Item Fields** — for any item addition request where equipment name or department is empty/whitespace, the system must return HTTP 400 and must not create any record in `forge_equipment`, `forge_acquisition_items`, or `forge_equipment_events`
    - **Validates: Requirements 4.4**
    - Test file: `backend/utils/acquisitionValidation.test.js`
    - Tag: `// Feature: lab-assistant-and-inventory-acquisition, Property 13/14`
    - Use `fc.oneof(fc.constant(''), fc.string().map(s => s.trim() === '' ? ' ' : ''))` for blank inputs; minimum 100 runs

- [x] 4. Register the acquisitions route in `backend/index.js`
  - Add `const adminAcquisitionsRoutes = require('./routes/admin/acquisitions');` with the other admin route imports
  - Add `app.use('/api/admin/acquisitions', adminAcquisitionsRoutes);` after the existing admin route registrations
  - _Requirements: 5.4_

- [x] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create `frontend/src/pages/admin/AcquisitionsManagement.jsx`
  - [x] 6.1 Implement the list view
    - Fetch `GET /api/admin/acquisitions` on mount; display a table with columns: Supplier, Date, Items, Created By, and a "View" action button
    - Follow the same sticky header + back-navigation + error/success banner pattern as `EquipmentManagement.jsx`
    - Show a "New Acquisition" button in the page title row
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Implement the "New Acquisition" modal
    - Modal with fields: Supplier Name (required), Acquisition Date (required), Notes (optional)
    - Client-side validation: highlight missing required fields with red border and inline error message before submitting
    - On success, call `POST /api/admin/acquisitions`, then navigate to the detail view for the new acquisition ID
    - _Requirements: 6.3, 6.4, 6.7_

  - [x] 6.3 Implement the acquisition detail view (inline or modal expansion)
    - When a Lab Admin clicks "View" on a list row, fetch `GET /api/admin/acquisitions/:id` and display acquisition metadata plus a table of items (Equipment ID, Name, Department, Condition, Room)
    - Include an "Add Item" form below the items table with fields: Equipment Name (required), Department (required), Initial Condition (select: Excellent / Good / Fair / Poor), Assigned Lab Room (optional)
    - On submit, call `POST /api/admin/acquisitions/:id/items`; on success, refresh the item list and show a success banner that auto-dismisses after 3 seconds
    - Client-side validation for required fields before submission
    - _Requirements: 6.5, 6.6, 6.7, 6.8_

- [x] 7. Add the `/admin/acquisitions` route and nav card
  - [x] 7.1 Add route in `frontend/src/App.jsx`
    - Import `AcquisitionsManagement` from `./pages/admin/AcquisitionsManagement`
    - Add `<Route path="/admin/acquisitions" element={<AdminRoute><AcquisitionsManagement /></AdminRoute>} />` alongside the other admin routes
    - _Requirements: 6.1_

  - [x] 7.2 Add "Acquisitions" nav card to `frontend/src/pages/admin/AdminDashboard.jsx`
    - Import `ShoppingCart` from `lucide-react`
    - Add a nav card button with `onClick={() => navigate('/admin/acquisitions')}`, icon `ShoppingCart`, title "Acquisitions", subtitle "Manage inventory intake"
    - Match the existing card styling (amber or orange color scheme to distinguish from existing cards)
    - _Requirements: 6.1_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use pure builder/simulator functions (same pattern as `backend/utils/atomicTransaction.test.js`) — no live DB required
- `getUniqueEquipmentId` is already exported from `backend/routes/admin/equipment.js`; import it directly in the acquisitions route
- The `buildRoomContext()` function must be exported from `backend/routes/ai.js` (or a separate utility file) so property tests can import it without spinning up the full Express app
- All property tests use `fast-check` (`fc`) with `{ numRuns: 100 }` minimum
