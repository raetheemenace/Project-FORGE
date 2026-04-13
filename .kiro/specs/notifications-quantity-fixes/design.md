# Notifications & Quantity Fixes — Bugfix Design

## Overview

This document covers four related bugs in the FORGE lab equipment management system. The bugs span two concerns: (1) missing user feedback on key events (notification bell reliability, LogUpdated page alerts), and (2) missing quantity visibility in both the admin Equipment Management page and the student Dashboard high-demand panel.

The fix strategy is minimal and targeted:
- Add audio/vibration alerts to `NotificationBell` when new unread notifications arrive between polls.
- Add audio/vibration and a toast to `LogUpdated` on mount.
- Extend `GET /api/admin/equipment` to return per-name available/total counts, and render them in `EquipmentManagement.jsx`.
- Render the already-returned `availableUnits`/`totalUnits` fields in `Dashboard.jsx`'s high-demand panel.

---

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger one of the four bugs.
- **Property (P)**: The desired correct behavior when the bug condition holds.
- **Preservation**: Existing behaviors that must remain unchanged after the fix.
- **NotificationBell**: `frontend/src/components/NotificationBell.jsx` — polls `/api/notifications` every 30 s and renders an unread badge.
- **LogUpdated**: `frontend/src/pages/LogUpdated.jsx` — success page shown after a borrow transaction is submitted.
- **EquipmentManagement**: `frontend/src/pages/admin/EquipmentManagement.jsx` — admin page listing all equipment rows.
- **Dashboard**: `frontend/src/pages/Dashboard.jsx` — student dashboard with a "High-Demand Equipment" panel.
- **highDemandEquipment**: Array returned by `GET /api/dashboard`; each item already includes `totalUnits` and `availableUnits` from the SQL query.
- **forge_equipment**: DB table where each physical unit is a separate row with a `status` column (`AVAILABLE`, `BORROWED`, `MAINTENANCE`, `DISPOSED`).

---

## Bug Details

### Bug Condition

The four bugs share a common theme: data exists or events fire correctly on the backend, but the frontend either ignores the data or omits the feedback.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — one of { NotificationPollResult, PageMount, AdminEquipmentListRender, DashboardEquipmentRender }
  OUTPUT: boolean

  IF input IS NotificationPollResult
    RETURN input.unreadCount > previousUnreadCount
           AND NOT audioChimePlayed
           AND NOT vibrationTriggered

  IF input IS PageMount AND page = LogUpdated
    RETURN NOT audioChimePlayed
           AND NOT vibrationTriggered
           AND NOT toastDisplayed

  IF input IS AdminEquipmentListRender
    RETURN availableCount NOT rendered per equipment name
           AND totalCount NOT rendered per equipment name

  IF input IS DashboardEquipmentRender
    RETURN input.item.availableUnits IS present in API response
           AND input.item.totalUnits IS present in API response
           AND NOT rendered in UI

  RETURN false
END FUNCTION
```

### Examples

- **Bug 1**: Admin sets transaction to `CLAIM_ID`. Backend inserts a `forge_notifications` row. The bell polls 28 seconds later, `unreadCount` goes from 0 to 1 — but no chime plays and the device does not vibrate. The student only notices if they happen to look at the screen.
- **Bug 2**: Student completes borrow flow and lands on `LogUpdated`. The page renders the success card silently — no sound, no vibration, no toast. The student has no sensory confirmation the request was received.
- **Bug 3**: Admin opens Equipment Management. The table shows each physical unit row (e.g., five rows of "Bunsen Burner") but no column shows "3 / 5 available". The admin cannot tell at a glance how many are borrowed.
- **Bug 4**: Student opens Dashboard. The API response for `highDemandEquipment` already contains `{ availableUnits: 2, totalUnits: 5 }` but the JSX never reads those fields, so no "2 / 5" label appears.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When a student has no unread notifications, the bell icon shows no badge and the dropdown shows "No notifications yet."
- When a student opens the `NotificationBell` dropdown, all notifications are marked read via `PATCH /api/notifications/read-all` and the badge clears.
- The `LogUpdated` page continues to display the transaction ID, department, lab room, and item count from `location.state`.
- Navigating back to the dashboard from `LogUpdated` continues to work.
- Admin dispose/edit operations continue to update equipment records without affecting unrelated rows.
- When a transaction is marked `RETURNED`, associated `forge_equipment` rows continue to be set back to `AVAILABLE`.
- The Dashboard API continues to return `activeTransactions`, `labRooms`, and `highDemandEquipment` in the same response shape.
- The admin equipment list continues to show individual rows grouped by department with ID, name, status, and action buttons.

**Scope:**
All inputs that do NOT match the four bug conditions above are completely unaffected by this fix. This includes mouse interactions, navigation, form submissions, QR code generation, and all other admin/student flows.

---

## Hypothesized Root Cause

### Bug 1 — NotificationBell: no audio/vibration on new notification

The `fetchNotifications` function updates `unreadCount` state but never compares the new count to the previous count. There is no `useRef` tracking the previous unread count, and no call to `new Audio(...).play()` or `navigator.vibrate(...)`. The polling loop simply re-renders the badge number.

### Bug 2 — LogUpdated: no sound, vibration, or toast

`LogUpdated` is a pure display component. It has no `useEffect` on mount that triggers audio, vibration, or a toast library call. The requirements specify these should fire when the page first renders.

### Bug 3 — EquipmentManagement: no available/total count

`GET /api/admin/equipment` returns only `equipment_id, name, department, s3_image_key, status` — one row per physical unit. The frontend groups rows by department but renders only ID, name, and status per row. Neither the backend query nor the frontend grouping logic aggregates available vs. total counts per equipment name.

### Bug 4 — Dashboard high-demand panel: availableUnits/totalUnits not rendered

`GET /api/dashboard` already computes `totalUnits` and `availableUnits` via subqueries and returns them in each `highDemandEquipment` item. However, `Dashboard.jsx` never reads `item.availableUnits` or `item.totalUnits` in the JSX — the fields are silently ignored.

---

## Correctness Properties

Property 1: Bug Condition — New Notification Triggers Sensory Alert

_For any_ poll result where `unreadCount` has increased since the last poll (isBugCondition returns true for NotificationPollResult), the fixed `NotificationBell` SHALL play an audio chime and trigger device vibration (where `navigator.vibrate` is supported), in addition to updating the badge.

**Validates: Requirements 2.1**

Property 2: Bug Condition — LogUpdated Page Triggers Confirmation Feedback

_For any_ mount of the `LogUpdated` page (isBugCondition returns true for PageMount/LogUpdated), the fixed component SHALL play a confirmation sound, trigger a short vibration (where supported), and display a visible "Request Submitted" toast or pop-up before or immediately after the page renders.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Admin Equipment List Shows Available/Total Counts

_For any_ render of the Equipment Management page (isBugCondition returns true for AdminEquipmentListRender), the fixed page SHALL display the count of available units and total units per equipment name (e.g., "3 / 5 available"), derived from the backend response.

**Validates: Requirements 2.3**

Property 4: Bug Condition — Dashboard High-Demand Panel Renders Quantity

_For any_ render of the Dashboard high-demand equipment panel where the API response includes `availableUnits` and `totalUnits` (isBugCondition returns true for DashboardEquipmentRender), the fixed component SHALL display those values (e.g., "2 / 5 available") for each equipment item.

**Validates: Requirements 2.4**

Property 5: Preservation — Existing Notification Bell Behavior Unchanged

_For any_ state where the bug condition does NOT hold for `NotificationBell` (unread count has not increased, or the dropdown is opened/closed), the fixed component SHALL produce the same behavior as the original: badge shows correct count, dropdown opens/closes, read-all is called on open, "No notifications yet" shown when empty.

**Validates: Requirements 3.1, 3.2**

Property 6: Preservation — Existing LogUpdated Display Unchanged

_For any_ render of `LogUpdated` where the display content is concerned (transaction card, back button, confirmation text), the fixed component SHALL render identically to the original, with no changes to layout, navigation, or state handling.

**Validates: Requirements 3.3**

Property 7: Preservation — Admin Equipment CRUD Unchanged

_For any_ admin create/edit/dispose/QR-code action, the fixed code SHALL produce the same result as the original, with no regressions to equipment record mutations or the list display.

**Validates: Requirements 3.4, 3.5**

Property 8: Preservation — Dashboard API Response Shape Unchanged

_For any_ call to `GET /api/dashboard`, the fixed backend SHALL return `activeTransactions`, `labRooms`, and `highDemandEquipment` in the same shape as before, so all other Dashboard sections are unaffected.

**Validates: Requirements 3.6**

---

## Fix Implementation

### Changes Required

**File 1**: `frontend/src/components/NotificationBell.jsx`

**Specific Changes**:
1. Add a `prevUnreadRef = useRef(0)` to track the previous unread count across polls.
2. After `setUnreadCount(count)`, compare `count > prevUnreadRef.current`. If true, play a short audio chime (Web Audio API oscillator or a small bundled audio file) and call `navigator.vibrate?.([200])`.
3. Update `prevUnreadRef.current = count` after the comparison.

---

**File 2**: `frontend/src/pages/LogUpdated.jsx`

**Specific Changes**:
1. Add a `useEffect(() => { ... }, [])` that fires on mount.
2. Inside the effect: play a confirmation chime (same helper as NotificationBell or a shared utility), call `navigator.vibrate?.([100, 50, 100])`, and set a local `showToast` state to `true`.
3. Add a small toast/banner element (e.g., a fixed bottom bar or an animated overlay) that renders when `showToast` is true and auto-dismisses after ~3 seconds.

---

**File 3**: `backend/routes/admin/equipment.js`

**Specific Changes**:
1. Modify `GET /api/admin/equipment` to aggregate counts per equipment name alongside the individual rows. The simplest approach: add a subquery or window function to include `totalUnits` and `availableUnits` per name in each row.

```sql
SELECT
  e.equipment_id,
  e.name,
  e.department,
  e.s3_image_key,
  e.status,
  COUNT(*) OVER (PARTITION BY e.name)::int AS "totalUnits",
  COUNT(*) FILTER (WHERE e.status = 'AVAILABLE') OVER (PARTITION BY e.name)::int AS "availableUnits"
FROM forge_equipment e
ORDER BY e.equipment_id ASC
```

---

**File 4**: `frontend/src/pages/admin/EquipmentManagement.jsx`

**Specific Changes**:
1. Add "Available" column header to the equipment table.
2. In each row, render `{eq.availableUnits} / {eq.totalUnits}` (or a badge) using the new fields from the API response.

---

**File 5**: `frontend/src/pages/Dashboard.jsx`

**Specific Changes**:
1. In the high-demand equipment panel, add a quantity display below or beside the equipment name: e.g., `{item.availableUnits} / {item.totalUnits} available`.
2. No backend change needed — the fields are already returned.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate the triggering conditions for each bug and assert the expected feedback/rendering. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Notification chime test**: Simulate a poll result where `unreadCount` increases from 0 to 1. Assert that `Audio.play` or Web Audio API was called. (Will fail on unfixed code — no audio call exists.)
2. **Notification vibration test**: Same setup. Assert `navigator.vibrate` was called. (Will fail on unfixed code.)
3. **LogUpdated mount chime test**: Mount `LogUpdated`. Assert audio play was called. (Will fail on unfixed code.)
4. **LogUpdated toast test**: Mount `LogUpdated`. Assert a toast/banner element is present in the DOM. (Will fail on unfixed code.)
5. **Admin equipment count test**: Render `EquipmentManagement` with mock data that includes `availableUnits`/`totalUnits`. Assert those values appear in the table. (Will fail on unfixed code — columns don't exist.)
6. **Dashboard quantity test**: Render the high-demand panel with `{ availableUnits: 2, totalUnits: 5 }`. Assert "2 / 5" appears in the output. (Will fail on unfixed code — fields are ignored.)

**Expected Counterexamples**:
- No audio or vibration calls are made in `NotificationBell` or `LogUpdated`.
- No quantity columns exist in the admin equipment table.
- `availableUnits`/`totalUnits` are present in the data but absent from the rendered DOM.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedComponent(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases**:
1. After fix: poll result with increased unread count → audio play called, vibrate called.
2. After fix: `LogUpdated` mount → audio play called, vibrate called, toast visible.
3. After fix: admin equipment list with `availableUnits`/`totalUnits` in response → counts rendered in table.
4. After fix: dashboard high-demand item with `availableUnits: 2, totalUnits: 5` → "2 / 5" visible in panel.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalComponent(input) = fixedComponent(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual unit tests might miss.

**Test Cases**:
1. **No new notifications**: Poll returns same unread count → no audio, no vibration, badge unchanged.
2. **Bell open/close**: Opening the dropdown marks all read and clears badge — behavior identical to original.
3. **Empty notification list**: "No notifications yet" still renders when list is empty.
4. **LogUpdated display**: Transaction card fields (txnId, department, labRoom, itemCount) render correctly from `location.state` — identical to original.
5. **Admin CRUD operations**: Create, edit, dispose, QR-code actions continue to work; new quantity columns do not interfere.
6. **Dashboard other sections**: Active transactions and lab rooms sections are unaffected by the high-demand panel change.

### Unit Tests

- Test `NotificationBell` renders badge when `unreadCount > 0` and no badge when `unreadCount === 0`.
- Test `NotificationBell` calls `read-all` API when opened with unread notifications.
- Test `LogUpdated` renders all transaction detail fields from `location.state`.
- Test admin equipment table renders `availableUnits`/`totalUnits` columns when data is present.
- Test dashboard high-demand panel renders quantity string when `availableUnits`/`totalUnits` are in the item.

### Property-Based Tests

- Generate random `unreadCount` sequences and verify audio fires only when count increases.
- Generate random equipment arrays with varying `availableUnits`/`totalUnits` and verify the rendered quantity string always matches the data.
- Generate random `location.state` objects for `LogUpdated` and verify the displayed values always match the input (preservation of display logic).

### Integration Tests

- Full borrow flow → `LogUpdated` page → verify toast appears and audio fires.
- Admin status update → notification inserted → next poll cycle → verify bell badge increments and chime fires.
- Admin equipment list load → verify available/total counts match DB state.
- Dashboard load → verify high-demand panel shows quantity for each item returned by the API.
