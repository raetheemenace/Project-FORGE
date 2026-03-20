# Requirements Document

## Introduction

FORGE (Facility Operations and Resource Governance Engine) is a cloud-native, multimodal lab management platform for the Technological Institute of the Philippines - Manila. It serves as a transactional ledger system for tracking high-value laboratory equipment and inventories across multidisciplinary facilities. The system is designed for touch-inefficient environments where users may wear gloves or have occupied hands, providing real-time asset tracking with multimodal interaction (voice, vision, haptic feedback) for hands-free operation. FORGE is a Progressive Web App (PWA) supporting both mobile (primary) and desktop (secondary) interfaces.

## Glossary

- **FORGE**: Facility Operations and Resource Governance Engine — the lab management platform.
- **Student**: An enrolled student at TIP-Manila who borrows lab equipment.
- **Lab Admin**: A laboratory administrator who manages inventory, approves returns, and monitors usage.
- **Transaction**: A borrowing record linking a student to one or more equipment items for a specific session.
- **Transaction ID**: A unique identifier for a borrowing transaction (e.g., TXN-20260305-001).
- **Equipment**: A physical lab item tracked by the system (e.g., Erlenmeyer Flask, Bunsen Burner).
- **Equipment ID**: A unique identifier assigned to each equipment item (e.g., EQ-7167).
- **Department Stockroom**: A categorized storage area for lab equipment (e.g., Chemistry, Physics, Engineering).
- **Lab Room**: A physical laboratory space identified by a room code (e.g., A-101, B-202).
- **QR Code**: A machine-readable code affixed to equipment for identification and maintenance reporting.
- **AI Scanner**: The AWS Bedrock Claude 3-powered image recognition module that identifies equipment via camera.
- **TTS**: Text-to-Speech — an accessibility feature that reads UI content aloud.
- **STT**: Speech-to-Text — an accessibility feature that accepts voice input from the user.
- **Multimodal HCI**: Human-Computer Interaction using multiple input/output modalities (voice, vision, touch).
- **PWA**: Progressive Web App — a web application installable on mobile and desktop devices.
- **Session**: A borrowing period defined by a date, time slot, course, lab room, and adviser.
- **Condition**: The physical state of equipment at time of borrowing (e.g., Excellent, Good, Fair, Poor).
- **Maintenance Report**: A record submitted by a student or admin flagging an equipment issue.
- **Severity**: The urgency level of a maintenance issue (e.g., Low, Medium, High, Critical).
- **S3**: Amazon Simple Storage Service — used for storing high-resolution equipment images.
- **Oracle DB**: Oracle 19c relational database used as the ACID-compliant transaction ledger.
- **JWT**: JSON Web Token — used for stateless authentication between frontend and backend.
- **Student ID**: A 7-digit numeric identifier uniquely assigned to each student (e.g., 2021001).
- **AWS Polly**: Amazon Web Services text-to-speech service used to synthesize voice readback in the TTS feature.
- **AWS Transcribe**: Amazon Web Services speech-to-text service used to process voice input in the STT feature.
- **AWS Bedrock**: Amazon Web Services managed AI service used to invoke Claude 3 models for equipment image identification.
- **AWS Amplify**: Amazon Web Services hosting platform for the frontend PWA.
- **AWS Elastic Beanstalk**: Amazon Web Services platform for hosting the backend Express.js service.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a student or lab admin, I want to securely sign in and sign up, so that I can access FORGE features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials on the Sign In page, THE System SHALL authenticate the user and redirect to the Dashboard within 3 seconds.
2. WHEN a user submits invalid credentials, THE System SHALL display an error message and retain the entered username without clearing it.
3. WHEN a new user completes the Sign Up form with valid data, THE System SHALL create an account, assign the Student role by default, and redirect to the Dashboard.
4. WHEN a user enters a Student ID during Sign Up, THE System SHALL validate that the Student ID is exactly 7 numeric digits and reject any value that does not conform.
5. IF a required field is left empty on Sign In or Sign Up, THEN THE System SHALL highlight the empty field and prevent form submission.
6. WHEN a user session expires, THE System SHALL redirect the user to the Sign In page and display a session expiry notification.
7. THE System SHALL encode authentication tokens as JWT and include role information (Student, Lab Admin) in the token payload.

---

### Requirement 2: Landing Page

**User Story:** As a prospective user, I want to view a landing page that describes FORGE, so that I can understand the platform before signing in.

#### Acceptance Criteria

1. WHEN a user visits the root URL without an active session, THE System SHALL display the Landing Page with navigation links to Sign In and Sign Up.
2. THE System SHALL display the following feature sections on the Landing Page: Live Resource Dashboard, AI-Powered Scanner, Transaction Management, QR Maintenance Reports, Multimodal Interaction, and Admin Clearance System.
3. THE System SHALL display a four-step workflow section on the Landing Page: Sign In, Browse and Select, AI Scan, and Track and Return.
4. WHEN a user clicks the "Enter Lab Portal" or "Launch Application" button, THE System SHALL navigate to the Sign In page.

---

### Requirement 3: Student Dashboard

**User Story:** As a student, I want to view a dashboard after signing in, so that I can see my active transactions, available lab rooms, and high-demand equipment at a glance.

#### Acceptance Criteria

1. WHEN a student signs in, THE System SHALL display the Dashboard with the student's name, program, a live clock, and a summary of active transactions.
2. THE System SHALL display the Dashboard with three navigation cards: Borrow an Item, My Transactions, and Report Maintenance.
3. THE System SHALL display a Laboratory Rooms section on the Dashboard showing each room's ID, type, current course session, and availability status (AVAILABLE, IN SESSION, MAINTENANCE).
4. THE System SHALL display a High Demand Equipment section on the Dashboard showing equipment name, current borrower, room location, and a time-remaining progress bar.
5. WHEN a student has active transactions, THE System SHALL display a badge count on the My Transactions navigation card.
6. WHILE the Dashboard is displayed, THE System SHALL update the live clock every second.

---

### Requirement 4: Borrow an Item — Step 1 (Department Selection)

**User Story:** As a student, I want to select a department stockroom, so that I can browse equipment available in that department.

#### Acceptance Criteria

1. WHEN a student navigates to Borrow an Item, THE System SHALL display Step 1 of 4 with selectable department cards: Chemistry, Physics, and Engineering.
2. WHEN a student selects a department card, THE System SHALL navigate to Step 2 (Borrowing Details) with the selected department pre-filled.
3. THE System SHALL display a TTS toggle button on Step 1 that activates or deactivates voice readback of screen content.
4. THE System SHALL display step progress indicators (dots) showing the current step out of four total steps.
5. WHILE TTS is active, THE System SHALL read aloud the page title and department options when the page loads.

---

### Requirement 5: Borrow an Item — Step 2 (Borrowing Details)

**User Story:** As a student, I want to fill in session details for my borrowing request, so that the transaction is properly logged with course and room information.

#### Acceptance Criteria

1. THE System SHALL display a Borrowing Details form on Step 2 with the following fields: Course, Time Slot (dropdown), Date (date picker), Lab Room ID, and Adviser/Instructor.
2. IF a student attempts to proceed to Step 3 with any required field empty, THEN THE System SHALL prevent navigation and highlight the empty fields.
3. WHEN a student selects a Time Slot from the dropdown, THE System SHALL display the selected value in the field.
4. WHEN a student selects a Date using the date picker, THE System SHALL validate that the date is not in the past.
5. WHILE TTS is active on Step 2, THE System SHALL read aloud each field label when the field receives focus.

---

### Requirement 6: Borrow an Item — Step 3 (AI Equipment Scanner)

**User Story:** As a student, I want to use the AI scanner to identify equipment by pointing my camera at it, so that I can add items to my borrowing cart without manual entry.

#### Acceptance Criteria

1. WHEN a student reaches Step 3, THE System SHALL activate the device camera and display a live viewfinder.
2. WHEN a student taps the Scan Equipment button, THE System SHALL capture the camera frame and send it to the AI Scanner (AWS Bedrock Claude 3) for identification.
3. WHEN the AI Scanner returns a result, THE System SHALL display the identified equipment name and condition, and offer an "Add to Cart" button.
4. WHEN a student taps "Add to Cart", THE System SHALL add the identified item to the scanned items list and display the updated item count.
5. WHEN a student taps "Review and Confirm", THE System SHALL navigate to Step 4 with the scanned items list.
6. IF the AI Scanner fails to identify the equipment, THEN THE System SHALL display an error message and allow the student to retry the scan.
7. THE System SHALL display a "Read Instruction" button that, when tapped, reads the scanner instructions aloud via TTS.
8. WHILE TTS is active on Step 3, THE System SHALL announce each identified item name and condition after a successful scan.

---

### Requirement 7: Borrow an Item — Step 4 (Review Summary)

**User Story:** As a student, I want to review all session and equipment details before confirming, so that I can verify accuracy before the transaction is logged.

#### Acceptance Criteria

1. THE System SHALL display a Review Summary on Step 4 showing: Department, Course, Date and Time, Lab Room, Adviser, and a numbered list of scanned equipment with condition badges.
2. THE System SHALL display a "Read Summary" button that, when tapped, reads all session and equipment details aloud via TTS.
3. WHEN a student taps "Confirm and Log Borrowing", THE System SHALL create a Transaction record in the Oracle DB with a unique Transaction ID, and navigate to the Log Updated confirmation screen.
4. THE System SHALL display a multimodal accessibility notice on Step 4 indicating TTS readback and STT dictation support.
5. IF the transaction creation fails due to a database error, THEN THE System SHALL display an error message and allow the student to retry.
6. WHEN a transaction is successfully created, THE System SHALL persist all session details, equipment list, and condition data to the Oracle DB atomically.

---

### Requirement 8: Transaction Confirmation

**User Story:** As a student, I want to see a confirmation screen after logging a borrowing transaction, so that I know the record was successfully created.

#### Acceptance Criteria

1. WHEN a transaction is successfully created, THE System SHALL display a Log Updated confirmation screen with a success icon, the message "Log Updated!", and a description that the record is visible to the Lab Admin.
2. THE System SHALL display a confirmation message on the Log Updated screen stating that a confirmation has been sent to the student's account.
3. WHEN a student taps "Back to Dashboard", THE System SHALL navigate to the Dashboard.

---

### Requirement 9: My Transactions

**User Story:** As a student, I want to view all my borrowing transactions, so that I can track active borrows, pending returns, and claim IDs.

#### Acceptance Criteria

1. WHEN a student navigates to My Transactions, THE System SHALL display a list of all transactions associated with the student's account, ordered by date descending.
2. THE System SHALL display for each transaction: Transaction ID, date, department, lab room, item count, equipment names, and a status badge (ACTIVE, PENDING RETURN, CLAIM ID).
3. THE System SHALL display summary counters at the top of My Transactions for: Active count, Pending Return count, and Claim ID count.
4. WHEN a student taps a transaction row, THE System SHALL display the full transaction detail.
5. IF a student has no transactions, THEN THE System SHALL display an empty state message.

---

### Requirement 10: Report Maintenance Issue

**User Story:** As a student, I want to report a maintenance issue for a piece of equipment by scanning its QR code, so that the lab admin is notified of the problem.

#### Acceptance Criteria

1. WHEN a student navigates to Report Maintenance, THE System SHALL display a QR code scanner interface with instructions to scan the equipment QR code.
2. WHEN a student scans or simulates a QR code scan, THE System SHALL auto-fill the Equipment ID field with the scanned value.
3. THE System SHALL display a maintenance report form with the following fields: Equipment ID (auto-filled), Severity (dropdown: Low, Medium, High, Critical), and Description (text area).
4. IF a student attempts to submit the report with Severity or Description empty, THEN THE System SHALL prevent submission and highlight the empty fields.
5. WHEN a student submits a valid maintenance report, THE System SHALL create a Maintenance Report record in the Oracle DB and display a success confirmation screen.
6. WHEN a maintenance report is successfully submitted, THE System SHALL display the Equipment ID on the confirmation screen and a message that the report has been sent to the Lab Admin.

---

### Requirement 11: Multimodal Accessibility (TTS and STT)

**User Story:** As a student working in a touch-inefficient environment, I want to use voice commands and text-to-speech throughout the borrowing flow, so that I can operate FORGE hands-free.

#### Acceptance Criteria

1. THE System SHALL provide a TTS toggle button on every step of the Borrow an Item flow that enables or disables voice readback.
2. WHILE TTS is enabled, THE System SHALL read aloud all form field labels, instructions, and confirmation messages when they are rendered.
3. THE System SHALL provide a microphone (STT) button on the AI Scanner step that, when activated, accepts voice input to trigger equipment scanning.
4. WHEN STT is active, THE System SHALL display a "Speaking..." indicator and process the voice input within 5 seconds.
5. THE System SHALL display "Voice Feedback Active" and "Voice Input Available" status indicators at the bottom of applicable screens.

---

### Requirement 12: Transaction Ledger Integrity

**User Story:** As a lab admin, I want all borrowing transactions to be stored with ACID compliance, so that concurrent borrowing requests do not cause data conflicts.

#### Acceptance Criteria

1. THE System SHALL store all transaction records in the Oracle DB using ACID-compliant transactions.
2. WHEN two students attempt to borrow the same equipment item simultaneously, THE System SHALL allow only one transaction to succeed and return an appropriate conflict error to the other.
3. THE System SHALL assign a unique Transaction ID to every successfully committed transaction using the format TXN-YYYYMMDD-NNN.
4. WHEN a transaction is committed, THE System SHALL record the timestamp, student ID, equipment list, session details, and transaction status atomically.

---

### Requirement 13: Equipment Image Storage

**User Story:** As a lab admin, I want high-resolution equipment images stored in S3, so that the AI scanner and audit trail have accurate visual references.

#### Acceptance Criteria

1. THE System SHALL store high-resolution equipment images in AWS S3 with a unique key per equipment item.
2. WHEN the AI Scanner identifies equipment, THE System SHALL retrieve the corresponding S3 image URL and include it in the identification result.
3. THE System SHALL generate pre-signed S3 URLs for equipment images with an expiry of 7 days for display in the frontend.

---

### Requirement 14: Responsive and PWA Behavior

**User Story:** As a student, I want to use FORGE on both my mobile phone and a desktop browser, so that I can access the system from any device.

#### Acceptance Criteria

1. THE System SHALL render all screens using a mobile-first responsive layout, with breakpoints adapting the UI for desktop viewports.
2. THE System SHALL be installable as a PWA on Android and iOS devices via the browser's "Add to Home Screen" feature.
3. WHEN the PWA is installed and the device is offline, THE System SHALL display a cached offline page with a message indicating no connectivity.

---

### Requirement 15: Lab Admin Portal

**User Story:** As a lab admin, I want a dedicated portal to manage equipment, transactions, maintenance tickets, users, and lab rooms, so that I can oversee all lab operations from a single interface.

#### Acceptance Criteria

1. WHEN a user with the Lab Admin role signs in, THE System SHALL display the Admin Dashboard with summary statistics: total active transactions, open maintenance tickets, equipment availability count, and registered users.
2. THE System SHALL provide an Equipment Management page where a lab admin can create, update, and deactivate equipment records, including uploading equipment images to S3.
3. WHEN a lab admin views the Transaction Oversight page, THE System SHALL display all transactions across all students with filters for status, department, date range, and student.
4. WHEN a lab admin updates a transaction status on the Transaction Oversight page, THE System SHALL persist the new status to the Oracle DB and record the action in the admin audit log.
5. THE System SHALL provide a Maintenance Tickets page where a lab admin can view all submitted maintenance reports, assign tickets to personnel, update ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED), and record resolutions.
6. THE System SHALL provide a User Management page where a lab admin can view all registered users and disable or re-enable student accounts.
7. THE System SHALL provide a Lab Room Management page where a lab admin can create, update, and deactivate lab room records.
8. THE System SHALL provide a System Reports page displaying daily analytics per department: total transactions, total equipment borrowed, total maintenance reports, and average session duration.
9. THE System SHALL record every admin action (equipment CRUD, user disable, transaction override, ticket update) in an audit log with the admin's user ID, action type, target entity, and timestamp.
10. WHEN a request is made to any admin endpoint, THE System SHALL verify the JWT contains the LAB_ADMIN role and return HTTP 403 if the role is absent.

---

### Requirement 16: Cloud Infrastructure

**User Story:** As a system operator, I want FORGE deployed on AWS managed services, so that the platform is scalable, reliable, and maintainable without on-premise infrastructure.

#### Acceptance Criteria

1. THE System SHALL host the React PWA frontend on AWS Amplify and serve it via Amplify's managed CDN.
2. THE System SHALL host the Express.js backend API on AWS Elastic Beanstalk and expose it via the Elastic Beanstalk environment URL.
3. THE System SHALL connect the backend to an Oracle 19c database instance hosted on Amazon RDS and use the RDS endpoint as the database connection string.
4. WHEN the backend receives a request requiring AI image identification, THE System SHALL invoke the AWS Bedrock Claude 3 model via the Bedrock Runtime API.
5. WHEN the TTS feature is activated, THE System SHALL synthesize speech by invoking AWS Polly and stream the resulting audio to the client.
6. WHEN the STT feature is activated, THE System SHALL transcribe voice input by invoking AWS Transcribe and return the resulting text to the client within 5 seconds.
7. THE System SHALL store and retrieve all equipment images using AWS S3, with the backend generating pre-signed URLs for secure frontend access.
