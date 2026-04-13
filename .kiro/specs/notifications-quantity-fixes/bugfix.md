# Bugfix Requirements Document

## Introduction

This document covers four related bugs in the FORGE lab equipment management system:

1. **Notifications not working** — the `NotificationBell` component polls `/api/notifications` but notifications are not appearing correctly for users after status changes.
2. **LogUpdated page missing feedback** — when a borrow transaction is submitted and the user lands on the `LogUpdated` page, there is no sound/vibration alert and no "request submitted" pop-up confirmation.
3. **Quantity not deducted on borrow** — when a student borrows a tool, the admin's Equipment Management page and the student's Dashboard both fail to reflect the reduced available quantity; the equipment count shown does not account for currently-borrowed units.
4. **Students cannot see available quantity** — the student-facing Dashboard and high-demand equipment panel do not display how many units of each tool are available vs. total, so students have no visibility into stock levels.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin updates a transaction status (e.g., to `CLAIM_ID` or `RETURNED`) THEN the system inserts a `forge_notifications` row but the `NotificationBell` component does not reliably surface it to the student because the 30-second polling interval may miss the update and there is no visual or audio alert on arrival.

1.2 WHEN a student completes the borrow flow and is redirected to the `LogUpdated` page THEN the system displays a static success screen without triggering any sound, vibration, or a "request submitted" pop-up notification.

1.3 WHEN a student borrows one or more tools and the transaction is created THEN the system marks each `forge_equipment` row as `BORROWED` (status field) but the admin's Equipment Management page still shows the same total item count with no indication of how many units are currently borrowed vs. available.

1.4 WHEN a student views the Dashboard's "High-Demand Equipment" panel THEN the system returns `totalUnits` and `availableUnits` fields from the API but the frontend does not render them, so students see no quantity information.

### Expected Behavior (Correct)

2.1 WHEN a new notification is created for a user THEN the system SHALL update the `NotificationBell` unread badge within the next polling cycle (≤ 30 seconds) and SHALL play an audio chime and trigger device vibration (where supported) to alert the student.

2.2 WHEN a student lands on the `LogUpdated` page after submitting a borrow request THEN the system SHALL play a confirmation sound, trigger a short vibration (where supported), and display a "Request Submitted" pop-up or toast notification before the page fully renders.

2.3 WHEN a student borrows equipment and the admin views the Equipment Management page THEN the system SHALL display the count of available units (i.e., units with status `AVAILABLE`) alongside the total unit count for each equipment name, so the deduction is visible.

2.4 WHEN a student views the Dashboard's "High-Demand Equipment" panel THEN the system SHALL display the available unit count and total unit count for each equipment item (e.g., "2 / 5 available") so students can see current stock levels.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student has no unread notifications THEN the system SHALL CONTINUE TO show the bell icon without a badge and SHALL CONTINUE TO display "No notifications yet" in the dropdown.

3.2 WHEN a student opens the `NotificationBell` dropdown THEN the system SHALL CONTINUE TO mark all notifications as read via `PATCH /api/notifications/read-all` and clear the unread badge.

3.3 WHEN a student completes the borrow flow THEN the system SHALL CONTINUE TO navigate to the `LogUpdated` page and display the transaction ID, department, lab room, and item count.

3.4 WHEN an admin disposes or edits equipment THEN the system SHALL CONTINUE TO update the equipment record and reflect the change in the Equipment Management list without affecting unrelated equipment rows.

3.5 WHEN a transaction is marked `RETURNED` by an admin THEN the system SHALL CONTINUE TO set the associated `forge_equipment` rows back to `AVAILABLE` status.

3.6 WHEN the Dashboard API is called THEN the system SHALL CONTINUE TO return active transactions, lab rooms, and high-demand equipment in the same response shape so existing UI sections are unaffected.
