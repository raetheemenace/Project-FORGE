# Bugfix Requirements Document

## Introduction

This document captures a batch of bugs and missing features across the FORGE Lab Equipment Management System. The issues span the TTS voice system, the user dashboard, the AI assistant, the Request Equipment page, and the Borrowing flow. Each section below identifies what is currently broken or missing, what the correct behavior should be, and what existing behavior must be preserved.

---

## Bug Analysis

### Current Behavior (Defect)

**TTS Voice Overlap**
1.1 WHEN a new `speak()` call is made while a previous AWS Polly audio clip is still playing THEN the system plays both audio clips simultaneously, causing overlapping voices.

**Report Maintenance on User Dashboard**
1.2 WHEN a regular (non-admin) user views the Dashboard THEN the system displays a "Report Maintenance" navigation card, which should not be accessible from the user dashboard.

**Student Before/After Picture Edge Cases**
1.3 WHEN a student submits a borrowing transaction without an equipment photo being captured THEN the system does not record a before-picture, leaving the condition comparison incomplete on return.
1.4 WHEN a student returns equipment and no after-picture is captured THEN the system accepts the return without a condition record, making damage assessment impossible.

**AI Assistant — No Image Support**
1.5 WHEN a user asks the AI assistant "what is a beaker" or "what does a Bunsen burner look like" THEN the system returns only a text answer with no image, even though a visual would directly answer the question.

**Stocks Availability Visibility**
1.6 WHEN a regular user views the Dashboard or browses equipment THEN the system does not display stock availability counts (available units vs. total units) in a consistent, visible way for all equipment.

**No Countdown Timer for Borrowing**
1.7 WHEN a user has an active borrowing transaction THEN the system does not display a countdown timer showing how much time remains in the scheduled borrowing slot.
1.8 WHEN the borrowing countdown reaches zero THEN the system produces no alarm or notification sound to alert the user.

**Countdown Runs Outside Scheduled Hours**
1.9 WHEN a user has an active borrowing transaction and the current time is outside the scheduled time slot THEN the system either shows no countdown or shows an incorrect countdown that does not respect the scheduled slot boundaries.

**Request Equipment — No Department-First Filter**
1.10 WHEN a user opens the Request Equipment page THEN the system shows a flat equipment form without first requiring the user to select a department, making it unclear which department's inventory is being requested from.

**Request Equipment — No Equipment Sidebar**
1.11 WHEN a user selects a department on the Request Equipment page THEN the system does not show a sidebar or panel listing available equipment for that department along with Equipment IDs.

**Request Equipment — No Borrowing Limit Enforcement**
1.12 WHEN a user submits a request for more than 10 equipment items in total THEN the system accepts the request without enforcing the maximum borrowing limit of 10 items per user.

**Request Equipment — Bulk Orders Allowed**
1.13 WHEN a user sets a quantity greater than 1 for a single equipment item on the Request Equipment page THEN the system allows the bulk order, which should be restricted to quantity 1 per item per request.

**Request Equipment — Status Display Incorrect**
1.14 WHEN a user views their request history and a request has been approved or fulfilled THEN the system displays an incorrect or misleading status label that does not match the actual state of the request.

**Request Equipment — No Post-Approval Instructions**
1.15 WHEN a user's equipment request is approved THEN the system does not show instructions telling the user to go to the stock room and ask staff about the approved request.

**Borrowing Page — No Condition/Criteria Fields**
1.16 WHEN a user adds equipment to the borrowing cart (Step 3) via AI scan or QR scan THEN the system does not prompt the user to record the condition or any criteria/notes for that specific item at the time of scanning.

**Borrowing Page — Bulk Orders Allowed**
1.17 WHEN a user manually enters equipment in the borrowing flow and sets a quantity greater than 1 THEN the system adds multiple copies of the same item in a single entry, which should not be permitted.

---

### Expected Behavior (Correct)

**TTS Voice Overlap**
2.1 WHEN a new `speak()` call is made while a previous audio clip is still playing THEN the system SHALL cancel the in-progress audio before starting the new one, ensuring only one voice plays at a time.

**Report Maintenance on User Dashboard**
2.2 WHEN a regular (non-admin) user views the Dashboard THEN the system SHALL NOT display the "Report Maintenance" navigation card; the card SHALL only appear for admin users or be removed entirely from the user dashboard.

**Student Before/After Picture Edge Cases**
2.3 WHEN a student submits a borrowing transaction THEN the system SHALL require or clearly prompt for a before-picture of each equipment item, and SHALL store the image reference with the transaction item record.
2.4 WHEN a student initiates a return THEN the system SHALL require or clearly prompt for an after-picture of each equipment item before the return is accepted.

**AI Assistant — Image Support**
2.5 WHEN a user asks the AI assistant a question about what a piece of lab equipment looks like THEN the system SHALL include a relevant image (or image URL) in the response alongside the text answer.

**Stocks Availability Visibility**
2.6 WHEN any user (admin or regular) views equipment listings or the dashboard THEN the system SHALL display available units and total units for each equipment item in a consistent, visible format.

**Countdown Timer**
2.7 WHEN a user has an active borrowing transaction THEN the system SHALL display a live countdown timer showing the remaining time within the scheduled borrowing slot.
2.8 WHEN the borrowing countdown reaches zero THEN the system SHALL play an alarm or ding sound to alert the user that their borrowing time has ended.

**Countdown Runs Within Scheduled Hours Only**
2.9 WHEN a user has an active borrowing transaction and the current time is before the scheduled start time THEN the system SHALL display the full slot duration as remaining time and SHALL NOT start counting down.
2.10 WHEN a user has an active borrowing transaction and the current time is after the scheduled end time THEN the system SHALL show 0 minutes remaining and SHALL have already triggered the alarm.

**Request Equipment — Department-First Flow**
2.11 WHEN a user opens the Request Equipment page THEN the system SHALL require the user to select a department before any equipment fields are shown or enabled.
2.12 WHEN a user selects a department THEN the system SHALL display only the equipment belonging to that department.

**Request Equipment — Equipment Sidebar**
2.13 WHEN a user has selected a department on the Request Equipment page THEN the system SHALL display a sidebar (or equivalent panel) listing available equipment for that department, including each item's name and Equipment ID.

**Request Equipment — Borrowing Limit**
2.14 WHEN a user attempts to submit a request that would bring their total active borrowed items above 10 THEN the system SHALL reject the submission and display an error message stating the 10-item borrowing limit.

**Request Equipment — No Bulk Orders**
2.15 WHEN a user fills in the Request Equipment form THEN the system SHALL restrict each line item to a quantity of 1 and SHALL NOT allow quantities greater than 1 per item.

**Request Equipment — Correct Status Display**
2.16 WHEN a user views their request history THEN the system SHALL display the correct status label for each request, accurately reflecting PENDING, APPROVED, REJECTED, or FULFILLED states.

**Request Equipment — Post-Approval Instructions**
2.17 WHEN a user views a request that has been approved THEN the system SHALL display an instruction message: "Your request has been approved. Please go to the stock room and ask the staff about your approved request."

**Borrowing Page — Condition/Criteria Fields**
2.18 WHEN a user adds an equipment item to the borrowing cart via AI scan, QR scan, or manual entry THEN the system SHALL present condition and criteria fields for that item before it is added to the cart.

**Borrowing Page — No Bulk Orders**
2.19 WHEN a user uses manual entry in the borrowing flow THEN the system SHALL restrict the quantity field to 1 and SHALL NOT allow the user to add multiple copies of the same item in a single entry.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN TTS is disabled THEN the system SHALL CONTINUE TO remain silent and not play any audio.
3.2 WHEN a user navigates away from a page with active TTS THEN the system SHALL CONTINUE TO stop the current audio on unmount.
3.3 WHEN an admin user views the Dashboard THEN the system SHALL CONTINUE TO display all existing navigation cards and admin-specific controls.
3.4 WHEN a user scans equipment via AI camera in Step 3 THEN the system SHALL CONTINUE TO identify the equipment and return name, condition, and confidence score.
3.5 WHEN a user scans a QR code in Step 3 THEN the system SHALL CONTINUE TO look up the equipment by ID and add it to the cart.
3.6 WHEN a user submits a valid borrowing transaction in Step 4 THEN the system SHALL CONTINUE TO create the transaction and navigate to the log-updated confirmation screen.
3.7 WHEN a user views the Request Equipment history tab THEN the system SHALL CONTINUE TO display all past requests with their equipment name, ID, department, quantity, urgency, reason, and submission date.
3.8 WHEN the AI assistant is asked a general lab knowledge question (not image-related) THEN the system SHALL CONTINUE TO return a text answer using the existing Bedrock/Claude integration.
3.9 WHEN a user selects a time slot and date in BorrowStep2 THEN the system SHALL CONTINUE TO validate that the date is not in the past before proceeding.
3.10 WHEN a user with fewer than 10 active borrowed items submits a valid request THEN the system SHALL CONTINUE TO accept and process the request normally.
