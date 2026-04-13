# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Missing Sensory Feedback & Quantity Rendering
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all four bugs exist
  - **Scoped PBT Approach**: Scope each property to the concrete failing case to ensure reproducibility
  - Test 1a — NotificationBell chime: simulate a poll where `unreadCount` increases from 0 to 1; assert `Audio.play` or Web Audio API oscillator was called (from Bug Condition: `input.unreadCount > previousUnreadCount AND NOT audioChimePlayed`)
  - Test 1b — NotificationBell vibration: same setup; assert `navigator.vibrate` was called with a non-empty pattern
  - Test 1c — LogUpdated mount chime: mount `LogUpdated` with minimal `location.state`; assert audio play was called (from Bug Condition: `page = LogUpdated AND NOT audioChimePlayed`)
  - Test 1d — LogUpdated toast: mount `LogUpdated`; assert a toast/banner element with "Request Submitted" text is present in the DOM (from Bug Condition: `NOT toastDisplayed`)
  - Test 1e — Admin equipment counts: render `EquipmentManagement` with mock data containing `availableUnits: 3, totalUnits: 5`; assert "3 / 5" or equivalent appears in the table (from Bug Condition: `availableCount NOT rendered per equipment name`)
  - Test 1f — Dashboard quantity: render the high-demand panel with `{ availableUnits: 2, totalUnits: 5 }`; assert "2 / 5" appears in the output (from Bug Condition: `availableUnits IS present in API response AND NOT rendered in UI`)
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "no audio call made", "toast element absent", "'3 / 5' not in DOM")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Notification, LogUpdated, Equipment, and Dashboard Behaviors
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs, observe outputs, then write tests
  - Observe: `NotificationBell` with `unreadCount = 0` renders bell with no badge and "No notifications yet" in dropdown
  - Observe: Opening `NotificationBell` dropdown when `unreadCount > 0` calls `PATCH /api/notifications/read-all` and clears badge
  - Observe: `LogUpdated` renders txnId, department, labRoom, itemCount from `location.state` and "Back to Dashboard" button navigates correctly
  - Observe: Admin equipment table renders equipment_id, name, StatusBadge, and action buttons (QR, edit, dispose) for each row
  - Observe: Dashboard high-demand panel renders equipment name and borrower info when `isBorrowed` is true; renders AVAILABLE badge when not borrowed
  - Write property-based tests:
    - For all `unreadCount` values that have NOT increased since last poll: assert no audio call, no vibrate call, badge count unchanged
    - For all non-empty notification arrays: assert dropdown renders each notification's message and timeAgo string
    - For all `location.state` objects with valid fields: assert rendered text matches input values exactly
    - For all equipment arrays without `availableUnits`/`totalUnits`: assert existing columns (ID, name, status, actions) still render
    - For all `highDemandEquipment` items: assert name and borrower/availability display is unchanged
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix all four bugs

  - [x] 3.1 Fix NotificationBell — add audio chime and vibration on new notifications
    - Add `prevUnreadRef = useRef(0)` to track previous unread count across polls
    - In `fetchNotifications`, after `setUnreadCount(count)`, compare `count > prevUnreadRef.current`
    - If true: create a short Web Audio API oscillator chime (or play a bundled audio file) and call `navigator.vibrate?.([200])`
    - Update `prevUnreadRef.current = count` after the comparison
    - File: `frontend/src/components/NotificationBell.jsx`
    - _Bug_Condition: `input.unreadCount > previousUnreadCount AND NOT audioChimePlayed AND NOT vibrationTriggered`_
    - _Expected_Behavior: audio chime plays and `navigator.vibrate([200])` is called when unread count increases_
    - _Preservation: badge, dropdown, read-all, and empty-state behavior remain identical_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.2 Fix LogUpdated — add mount effect with sound, vibration, and toast
    - Add `useState(false)` for `showToast`
    - Add `useEffect(() => { ... }, [])` that fires on mount: play confirmation chime, call `navigator.vibrate?.([100, 50, 100])`, set `showToast(true)`, auto-dismiss after 3 seconds
    - Add a toast/banner element (e.g., fixed bottom bar or animated overlay) that renders when `showToast` is true with "Request Submitted" text
    - File: `frontend/src/pages/LogUpdated.jsx`
    - _Bug_Condition: `page = LogUpdated AND NOT audioChimePlayed AND NOT vibrationTriggered AND NOT toastDisplayed`_
    - _Expected_Behavior: audio plays, vibrate called, "Request Submitted" toast visible on mount_
    - _Preservation: txnId, department, labRoom, itemCount display and back-navigation unchanged_
    - _Requirements: 2.2, 3.3_

  - [x] 3.3 Fix backend GET /api/admin/equipment — add window functions for availableUnits/totalUnits
    - Modify the SELECT query in `router.get('/')` to add window functions partitioned by `e.name`
    - Add `COUNT(*) OVER (PARTITION BY e.name)::int AS "totalUnits"` to the SELECT
    - Add `COUNT(*) FILTER (WHERE e.status = 'AVAILABLE') OVER (PARTITION BY e.name)::int AS "availableUnits"` to the SELECT
    - File: `backend/routes/admin/equipment.js`
    - _Bug_Condition: `availableCount NOT rendered per equipment name AND totalCount NOT rendered per equipment name`_
    - _Expected_Behavior: each row in the response includes `availableUnits` and `totalUnits` integers_
    - _Preservation: all existing fields (equipment_id, name, department, s3_image_key, status) still returned; POST/PUT/DELETE routes unchanged_
    - _Requirements: 2.3, 3.4, 3.5_

  - [x] 3.4 Fix EquipmentManagement.jsx — render availableUnits/totalUnits in the table
    - Add an "Available" column header to the `<thead>` row between "Status" and "Actions"
    - In each `<tbody>` row, add a `<td>` that renders `{eq.availableUnits} / {eq.totalUnits}` (or a styled badge)
    - File: `frontend/src/pages/admin/EquipmentManagement.jsx`
    - _Bug_Condition: `availableCount NOT rendered per equipment name`_
    - _Expected_Behavior: "3 / 5" (or equivalent) visible in the table for each equipment name group_
    - _Preservation: existing columns (ID, name, status, actions), grouping by department, search/filter, and CRUD modals unchanged_
    - _Requirements: 2.3, 3.4_

  - [x] 3.5 Fix Dashboard.jsx — render availableUnits/totalUnits in the high-demand panel
    - In the high-demand equipment panel JSX, add a quantity display for each item: e.g., `{item.availableUnits} / {item.totalUnits} available`
    - Render it below or beside the equipment name, visible regardless of `isBorrowed` state
    - No backend change needed — fields are already returned by `GET /api/dashboard`
    - File: `frontend/src/pages/Dashboard.jsx`
    - _Bug_Condition: `input.item.availableUnits IS present in API response AND NOT rendered in UI`_
    - _Expected_Behavior: "2 / 5 available" (or equivalent) visible for each high-demand item_
    - _Preservation: borrower name, time-remaining progress bar, AVAILABLE/MAINTENANCE badges, and all other dashboard sections unchanged_
    - _Requirements: 2.4, 3.6_

  - [x] 3.6 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Sensory Feedback & Quantity Rendering
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all four bugs
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run all six exploration tests (1a–1f) from step 1
    - **EXPECTED OUTCOME**: All tests PASS (confirms all four bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Behaviors Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm no regressions in notification bell behavior, LogUpdated display, admin CRUD, or dashboard sections

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full frontend test suite: `cd frontend && npx vitest --run`
  - Run the full backend test suite: `cd backend && npx vitest --run`
  - Ensure all tests pass; ask the user if questions arise
