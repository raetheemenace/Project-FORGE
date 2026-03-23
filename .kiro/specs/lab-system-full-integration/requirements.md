# Requirements Document

## Introduction

This feature covers the full-stack integration of the FORGE laboratory equipment borrowing system. The scope includes: connecting the user registration and sign-in flow to the PostgreSQL database so that accounts persist and can be used for subsequent sign-ins; enabling the AI camera on BorrowStep3 to identify laboratory equipment (beakers, flasks, chemistry/physics/engineering lab items) via AWS Bedrock Claude 3; ensuring the QR code scanner has a working camera feed and correctly resolves equipment identity from scanned QR codes; validating the end-to-end AI scanner integration with automated tests; and confirming that all database tables (forge_users, forge_equipment, forge_transactions, forge_txn_items, forge_maintenance, forge_scan_log, forge_lab_rooms, forge_equipment_events, forge_admin_actions, forge_analytics_daily, forge_maintenance_tickets) are wired to both the React frontend and the Node.js/Express backend so the website operates uniformly end-to-end.

## Glossary

- **Auth_Service**: The frontend module at `frontend/src/services/authService.js` responsible for calling `/api/auth/signup` and `/api/auth/signin`.
- **Auth_Route**: The Express router at `backend/routes/auth.js` handling `/api/auth/signup` and `/api/auth/signin`.
- **DB**: The PostgreSQL database accessed via `backend/db/pool.js`.
- **forge_users**: The PostgreSQL table storing student and admin accounts.
- **forge_equipment**: The PostgreSQL table storing lab equipment inventory.
- **forge_transactions**: The PostgreSQL table storing borrowing transaction headers.
- **forge_txn_items**: The PostgreSQL table storing per-transaction equipment line items.
- **forge_scan_log**: The PostgreSQL table storing AI scanner audit records.
- **forge_maintenance**: The PostgreSQL table storing maintenance reports.
- **forge_maintenance_tickets**: The PostgreSQL table storing maintenance workflow tickets.
- **forge_lab_rooms**: The PostgreSQL table storing laboratory room definitions.
- **forge_equipment_events**: The PostgreSQL table storing equipment lifecycle events.
- **forge_admin_actions**: The PostgreSQL table storing admin audit trail records.
- **forge_analytics_daily**: The PostgreSQL table storing daily analytics rollup data.
- **AI_Scanner**: The camera-based equipment identification feature on BorrowStep3 that sends a captured frame to AWS Bedrock Claude 3 via `/api/scanner/identify`.
- **QR_Scanner**: The `useQRScanner` hook and its associated camera feed that decodes FORGE QR codes to extract equipment IDs.
- **JWT**: JSON Web Token issued by the Auth_Route after successful sign-up or sign-in.
- **Bedrock**: AWS Bedrock Runtime service used to invoke Claude 3 for image-based equipment identification.
- **BorrowStep3**: The React page at `frontend/src/pages/borrow/BorrowStep3.jsx` hosting the AI_Scanner camera viewfinder.
- **BorrowStep4**: The React page at `frontend/src/pages/borrow/BorrowStep4.jsx` that submits the final borrowing transaction.
- **Transaction_Route**: The Express router at `backend/routes/transactions.js` handling transaction creation and retrieval.
- **Scanner_Route**: The Express router at `backend/routes/scanner.js` handling `/api/scanner/identify`.
- **Admin_Pages**: The React pages under `frontend/src/pages/admin/` for equipment, user, transaction, and maintenance management.

---

## Requirements

### Requirement 1: User Registration Persists to Database

**User Story:** As a student, I want to register an account so that my profile is saved and I can sign in afterwards.

#### Acceptance Criteria

1. WHEN a student submits the sign-up form with a valid full name, 7-digit student ID, and program, THE Auth_Route SHALL insert a new row into forge_users and return a JWT and user object.
2. WHEN a student submits the sign-up form with a student ID that already exists in forge_users, THE Auth_Route SHALL return HTTP 409 with the error message "Student ID already registered".
3. WHEN a student submits the sign-up form with a student ID that is not exactly 7 numeric digits, THE Auth_Route SHALL return HTTP 400 with a descriptive validation error.
4. WHEN a student submits the sign-up form with any required field missing (fullName, studentId, or program), THE Auth_Route SHALL return HTTP 400 with the error message "All fields are required: studentId, fullName, program".
5. WHEN the Auth_Route successfully creates a user, THE Auth_Service SHALL store the returned JWT in localStorage under the key "token" and the user object under the key "user".
6. WHEN the Auth_Route successfully creates a user, THE Auth_Service SHALL redirect the student to the dashboard page.

---

### Requirement 2: User Sign-In Authenticates Against Database

**User Story:** As a registered student, I want to sign in using my full name and student ID so that I can access the borrowing system.

#### Acceptance Criteria

1. WHEN a student submits the sign-in form with a full name and student ID that match a row in forge_users, THE Auth_Route SHALL return HTTP 200 with a JWT and user object.
2. WHEN a student submits the sign-in form with credentials that do not match any row in forge_users, THE Auth_Route SHALL return HTTP 401 with the error message "Invalid credentials".
3. WHEN a student submits the sign-in form with any required field missing, THE Auth_Route SHALL return HTTP 400 with a descriptive validation error.
4. WHEN the Auth_Route returns a valid JWT, THE Auth_Service SHALL store the token in localStorage and redirect the student to the dashboard page.
5. WHEN a protected API endpoint receives a request with an expired JWT, THE Auth_Route middleware SHALL return HTTP 401 with the error message "Token expired. Please sign in again."
6. WHEN a protected API endpoint receives a request with no Authorization header, THE Auth_Route middleware SHALL return HTTP 401 with the error message "Access denied. No token provided."

---

### Requirement 3: AI Camera Identifies Laboratory Equipment

**User Story:** As a student on BorrowStep3, I want the camera to identify laboratory equipment using AI so that I can add the correct item to my borrowing cart.

#### Acceptance Criteria

1. WHEN BorrowStep3 mounts, THE AI_Scanner SHALL request camera access using `navigator.mediaDevices.getUserMedia` with `facingMode: 'environment'` and display the live video feed in the viewfinder.
2. WHEN the student taps "Scan Equipment" and the camera is ready, THE AI_Scanner SHALL capture a JPEG frame from the video element, encode it as base64, and POST it to `/api/scanner/identify` with a valid JWT.
3. WHEN the Scanner_Route receives a valid base64 image, THE Scanner_Route SHALL invoke Bedrock with the image and a structured prompt requesting a JSON response containing name, condition (Excellent/Good/Fair/Poor), confidence (0–100), and equipmentId.
4. WHEN Bedrock returns a parseable JSON response, THE Scanner_Route SHALL return HTTP 200 with the fields: equipmentId (resolved from forge_equipment or null), name, condition, and confidence.
5. WHEN the Scanner_Route receives a Bedrock response for an equipmentId that exists in forge_equipment, THE Scanner_Route SHALL resolve and return the matching equipment_id from forge_equipment.
6. WHEN the Scanner_Route successfully processes a scan, THE Scanner_Route SHALL insert a record into forge_scan_log containing user_id, equipment_id, bedrock_response, predicted_name, and confidence_score.
7. WHEN Bedrock returns a non-JSON or unparseable response, THE Scanner_Route SHALL return HTTP 200 with name "Unknown Equipment", condition "Fair", confidence 0, and equipmentId null.
8. WHEN Bedrock returns a ThrottlingException, THE Scanner_Route SHALL return HTTP 429 with the error message "Too many scan requests. Please wait 30 seconds and try again."
9. WHEN Bedrock returns a ValidationException, THE Scanner_Route SHALL return HTTP 400 with the error message "Invalid image format. Please try a different image."
10. WHEN the camera permission is denied by the browser, THE AI_Scanner SHALL display an error message and a "Retry Camera" button within the viewfinder overlay.
11. WHEN the AI_Scanner successfully identifies equipment, THE AI_Scanner SHALL announce the equipment name and condition via TTS if TTS is enabled.

---

### Requirement 4: QR Code Scanner Has Working Camera and Resolves Equipment

**User Story:** As a student, I want to scan a QR code on lab equipment so that the system automatically identifies the equipment type and ID.

#### Acceptance Criteria

1. WHEN the QR_Scanner is started on a given HTML element, THE QR_Scanner SHALL initialize an Html5QrcodeScanner instance with `facingMode: 'environment'`, fps of 10, and a 250×250 qrbox.
2. WHEN the QR_Scanner decodes a QR code containing valid JSON with `type: "FORGE_EQUIPMENT"` and a non-empty `equipmentId`, THE QR_Scanner SHALL invoke the `onScanSuccess` callback with the equipmentId value.
3. WHEN the QR_Scanner decodes a QR code that is not valid JSON but contains a non-empty plain text string, THE QR_Scanner SHALL invoke the `onScanSuccess` callback with the trimmed plain text as the equipment ID.
4. WHEN the QR_Scanner decodes a QR code containing JSON that is missing the `type` or `equipmentId` fields, THE QR_Scanner SHALL invoke the `onScanError` callback with the message "Invalid QR code format: Missing equipment information".
5. WHEN the QR_Scanner decodes an empty or whitespace-only string, THE QR_Scanner SHALL invoke the `onScanError` callback with the message "Invalid QR code format: Unable to extract equipment ID".
6. WHEN the QR_Scanner is stopped, THE QR_Scanner SHALL call `scanner.clear()` to release the camera and set the internal scanner reference to null.
7. WHEN a scanned equipment ID is received by BorrowStep3, THE AI_Scanner SHALL query `/api/equipment/:id` to retrieve the equipment name and condition from forge_equipment and display the result in the scan result card.

---

### Requirement 5: AI Scanner Integration is Tested

**User Story:** As a developer, I want automated tests for the AI scanner integration so that I can verify correctness and catch regressions.

#### Acceptance Criteria

1. THE Scanner_Route test suite SHALL verify that a valid base64 image POST to `/api/scanner/identify` with a mocked Bedrock response returns HTTP 200 with the correct name, condition, confidence, and equipmentId fields.
2. THE Scanner_Route test suite SHALL verify that when Bedrock returns a non-JSON text response, the endpoint returns HTTP 200 with name "Unknown Equipment", condition "Fair", confidence 0, and equipmentId null.
3. THE Scanner_Route test suite SHALL verify that when Bedrock throws a ThrottlingException, the endpoint returns HTTP 429.
4. THE Scanner_Route test suite SHALL verify that when Bedrock throws a ValidationException, the endpoint returns HTTP 400.
5. THE Scanner_Route test suite SHALL verify that a successful scan inserts exactly one record into forge_scan_log with the correct user_id, predicted_name, and confidence_score.
6. THE Scanner_Route test suite SHALL verify that a request to `/api/scanner/identify` without a JWT returns HTTP 401.
7. THE Scanner_Route test suite SHALL verify that a request to `/api/scanner/identify` without an imageBase64 field returns HTTP 400.
8. FOR ALL valid base64 image inputs, the Scanner_Route SHALL return a response whose `condition` field is one of: "Excellent", "Good", "Fair", or "Poor" (round-trip property: the prompt constrains the output, and the response must conform to the schema).

---

### Requirement 6: All Database Tables Connected End-to-End

**User Story:** As a system operator, I want all database tables to be connected to both the frontend and backend so that the website works uniformly end-to-end.

#### Acceptance Criteria

1. WHEN a student completes BorrowStep4 and confirms the transaction, THE Transaction_Route SHALL atomically insert one row into forge_transactions and one row per cart item into forge_txn_items, then return HTTP 201 with the txnId.
2. WHEN the student views the My Transactions page, THE Transaction_Route SHALL return all forge_transactions rows for the authenticated user joined with forge_txn_items and forge_equipment, ordered by date descending.
3. WHEN an admin views the Equipment Management page, THE Admin_Pages SHALL fetch equipment data from `/api/admin/equipment` which queries forge_equipment and returns all rows.
4. WHEN an admin views the User Management page, THE Admin_Pages SHALL fetch user data from `/api/admin/users` which queries forge_users and returns all rows.
5. WHEN an admin views the Transaction Oversight page, THE Admin_Pages SHALL fetch transaction data from `/api/admin/transactions` which queries forge_transactions joined with forge_users and forge_txn_items.
6. WHEN an admin views the Maintenance Tickets page, THE Admin_Pages SHALL fetch ticket data from `/api/admin/tickets` which queries forge_maintenance_tickets joined with forge_maintenance and forge_equipment.
7. WHEN a student submits a maintenance report, THE maintenance route SHALL insert a row into forge_maintenance and a corresponding row into forge_maintenance_tickets with status "OPEN".
8. WHEN an admin performs a create, update, or delete action on equipment or users, THE admin route SHALL insert a row into forge_admin_actions with the action_type, target_type, target_id, and admin_id.
9. WHEN the AI_Scanner logs a scan, THE Scanner_Route SHALL insert a row into forge_scan_log with user_id, equipment_id (if resolved), bedrock_response, predicted_name, and confidence_score.
10. WHEN the Lab Room Management page loads, THE Admin_Pages SHALL fetch room data from `/api/admin/rooms` which queries forge_lab_rooms and returns all rows.
11. WHEN the System Reports page loads, THE Admin_Pages SHALL fetch analytics data from `/api/admin/system-reports` which queries forge_analytics_daily and returns aggregated metrics.
12. WHEN an equipment lifecycle event (PROCURED, TRANSFERRED, DISPOSED, CALIBRATED) is recorded by an admin, THE admin route SHALL insert a row into forge_equipment_events with the event_type, equipment_id, performed_by, and relevant location fields.
