# Requirements Document

## Introduction

This document covers two related features for the FORGE Lab Equipment Management System at the Technological Institute of the Philippines (TIP) Manila.

**Feature 1 — AI Lab Assistant: Lab-Specific Availability**
The existing AI Lab Assistant (powered by AWS Bedrock Claude 3) already answers general equipment availability questions using live database context. However, it lacks the ability to answer lab-room-scoped queries such as "How many items are available in the Chemistry Laboratory?" or "What equipment is available today in room B-201?". This feature enriches the AI's live context with per-lab-room equipment availability data so it can answer these questions accurately.

**Feature 2 — Inventory Acquisition Workflow**
Currently, admins can add individual equipment records manually via the Equipment Management page. There is no structured workflow for recording a formal acquisition event — e.g., receiving a batch of new items from a supplier, logging the source, quantity, and condition at intake, and automatically creating the corresponding equipment records. This feature adds an Acquisition module that fits naturally alongside the existing borrow, maintenance, and disposal lifecycle events already tracked in `forge_equipment_events`.

---

## Glossary

- **AI_Assistant**: The FORGE AI Q&A component powered by AWS Bedrock Claude 3, accessible from the student Dashboard.
- **Lab_Room**: A physical laboratory room tracked in `forge_lab_rooms` (e.g., A-101, B-201).
- **Equipment**: A single trackable item in `forge_equipment` with a unique Equipment ID (format: EQ-XXXX).
- **Acquisition**: A formal intake event in which one or more new Equipment items are added to the inventory from an external source (supplier, donation, transfer-in).
- **Acquisition_Record**: A record in the new `forge_acquisitions` table capturing the supplier, date, and notes for a batch acquisition.
- **Acquisition_Item**: A single Equipment unit linked to an Acquisition_Record, capturing the item's initial condition and assigned lab room.
- **Lab_Admin**: A user with `role = 'LAB_ADMIN'` who manages inventory, rooms, and transactions.
- **Student**: A user with `role = 'STUDENT'` who borrows equipment and uses the AI Assistant.
- **Live_Context**: The real-time database snapshot injected into the AI system prompt before each query, currently built in `backend/routes/ai.js → fetchLiveContext()`.
- **Equipment_Event**: A row in `forge_equipment_events` recording lifecycle milestones (PROCURED, TRANSFERRED, DISPOSED, CALIBRATED).
- **Dashboard**: The student-facing page at `/dashboard` that hosts the AI Q&A widget.
- **Admin_Portal**: The admin-facing section at `/admin` and its sub-pages.

---

## Requirements

### Requirement 1: AI Assistant Answers Lab-Room-Scoped Availability Queries

**User Story:** As a student, I want to ask the AI Assistant "What equipment is available in the Chemistry Laboratory today?" and receive an accurate, room-specific answer, so that I can plan which lab to visit before heading there.

#### Acceptance Criteria

1. WHEN a student submits a question referencing a specific lab room name or room ID, THE AI_Assistant SHALL include in its answer the count and names of available equipment assigned to or currently located in that room.
2. WHEN a student asks how many items are available in a specific lab room, THE AI_Assistant SHALL respond with a specific numeric count of AVAILABLE equipment for that room.
3. WHEN a student asks what equipment is available today in a specific lab room, THE AI_Assistant SHALL list the equipment names that have no active bookings in that room for today.
4. WHEN a student asks about a lab room that does not exist in the system, THE AI_Assistant SHALL respond that the room was not found and suggest checking the Dashboard for the list of active rooms.
5. THE Live_Context SHALL include, for each Lab_Room, the count of AVAILABLE equipment and the list of equipment names that are free (no active transaction today) in that room.
6. THE Live_Context SHALL include, for each Lab_Room, the list of equipment names that are currently BOOKED (have an active transaction today) along with their booked time slots.
7. WHEN the database query for live context fails, THE AI_Assistant SHALL degrade gracefully and answer using only its static knowledge, without returning an error to the student.

---

### Requirement 2: AI Assistant Answers Cross-Lab Availability Summaries

**User Story:** As a student, I want to ask "Which lab has the most available equipment right now?" or "How many total items are available across all labs?", so that I can quickly decide where to go.

#### Acceptance Criteria

1. WHEN a student asks for a cross-lab availability summary, THE AI_Assistant SHALL provide a per-room breakdown of available equipment counts using the Live_Context data.
2. WHEN a student asks which lab room has the most available equipment, THE AI_Assistant SHALL identify and name the room with the highest count of AVAILABLE equipment today.
3. THE Live_Context SHALL include a summary section listing each Lab_Room with its total equipment count and available equipment count for today.

---

### Requirement 3: Acquisition Record Creation (Admin)

**User Story:** As a Lab Admin, I want to create an acquisition record that captures the supplier, acquisition date, and notes for a batch of new equipment, so that the system maintains a traceable procurement history.

#### Acceptance Criteria

1. WHEN a Lab_Admin submits a new acquisition with a supplier name and acquisition date, THE System SHALL create an Acquisition_Record in the database and return the new acquisition ID.
2. IF the supplier name is empty or the acquisition date is missing, THEN THE System SHALL return a 400 error with a descriptive message identifying the missing field.
3. THE System SHALL record the Lab_Admin's user ID as the creator of each Acquisition_Record for audit purposes.
4. WHEN an Acquisition_Record is created, THE System SHALL log a `ACQUISITION_CREATED` action in `forge_admin_actions` with the acquisition ID and supplier name.
5. THE Acquisition_Record SHALL support an optional free-text notes field for recording additional context such as purchase order numbers or delivery conditions.

---

### Requirement 4: Acquisition Item Addition (Admin)

**User Story:** As a Lab Admin, I want to add individual equipment items to an acquisition record, specifying the name, department, initial condition, and assigned lab room for each item, so that each piece of equipment is properly registered in the inventory.

#### Acceptance Criteria

1. WHEN a Lab_Admin adds an item to an Acquisition_Record, THE System SHALL create a new Equipment record in `forge_equipment` with status `AVAILABLE` and a unique auto-generated Equipment ID (format: EQ-XXXX).
2. WHEN a Lab_Admin adds an item to an Acquisition_Record, THE System SHALL create an Acquisition_Item record linking the new Equipment to the Acquisition_Record.
3. WHEN a Lab_Admin adds an item to an Acquisition_Record, THE System SHALL create a `PROCURED` event in `forge_equipment_events` referencing the new Equipment ID, the Lab_Admin's user ID, and the assigned lab room as `to_location`.
4. IF the equipment name or department is missing when adding an acquisition item, THEN THE System SHALL return a 400 error with a descriptive message.
5. IF the specified Acquisition_Record does not exist, THEN THE System SHALL return a 404 error.
6. THE System SHALL support adding multiple items to a single Acquisition_Record in one request (batch add), returning the list of created Equipment IDs.
7. WHEN a batch of items is added, THE System SHALL execute all inserts within a single database transaction so that a partial failure does not leave orphaned records.

---

### Requirement 5: Acquisition List and Detail View (Admin)

**User Story:** As a Lab Admin, I want to view a list of all acquisition records and drill into each one to see the items received, so that I can audit procurement history.

#### Acceptance Criteria

1. WHEN a Lab_Admin requests the acquisitions list, THE System SHALL return all Acquisition_Records ordered by acquisition date descending, including the supplier name, date, item count, and creator's name.
2. WHEN a Lab_Admin requests the detail of a specific Acquisition_Record, THE System SHALL return the acquisition metadata and the full list of Acquisition_Items with their Equipment IDs, names, departments, initial conditions, and assigned lab rooms.
3. IF a requested Acquisition_Record does not exist, THEN THE System SHALL return a 404 error.
4. THE acquisitions list and detail endpoints SHALL require LAB_ADMIN role authentication.

---

### Requirement 6: Acquisition Management UI (Admin)

**User Story:** As a Lab Admin, I want a dedicated Acquisition page in the Admin Portal where I can create acquisitions, add items, and review acquisition history, so that I can manage inventory intake without leaving the system.

#### Acceptance Criteria

1. THE Admin_Portal SHALL include an "Acquisitions" navigation entry on the Admin Dashboard that links to `/admin/acquisitions`.
2. WHEN a Lab_Admin visits `/admin/acquisitions`, THE System SHALL display a list of all Acquisition_Records with supplier name, acquisition date, item count, and a "View" action.
3. WHEN a Lab_Admin clicks "New Acquisition", THE System SHALL display a form to enter supplier name, acquisition date, and optional notes.
4. WHEN a Lab_Admin submits the new acquisition form with valid data, THE System SHALL create the Acquisition_Record and navigate to the acquisition detail page where items can be added.
5. WHEN a Lab_Admin is on the acquisition detail page, THE System SHALL display a form to add equipment items, with fields for equipment name, department, initial condition (Excellent / Good / Fair / Poor), and assigned lab room.
6. WHEN a Lab_Admin submits the add-item form with valid data, THE System SHALL add the item to the acquisition, create the Equipment record, and refresh the item list on the detail page.
7. IF a required field is missing in the new acquisition form or the add-item form, THEN THE System SHALL highlight the invalid field and display an inline error message without submitting the form.
8. WHEN a Lab_Admin successfully adds an item, THE System SHALL display a success confirmation message that auto-dismisses after 3 seconds.

---

### Requirement 7: Acquisition Data Integrity and Audit

**User Story:** As a Lab Admin, I want every acquisition event to be fully traceable in the system's audit trail, so that I can verify the provenance of any equipment item.

#### Acceptance Criteria

1. THE System SHALL ensure that every Equipment record created through the Acquisition workflow has a corresponding `PROCURED` event in `forge_equipment_events`.
2. THE System SHALL ensure that every Acquisition_Record has a corresponding `ACQUISITION_CREATED` entry in `forge_admin_actions`.
3. WHEN an Equipment item is created via acquisition, THE AI_Assistant SHALL be able to report that item as AVAILABLE in its live context immediately after the acquisition is committed.
4. FOR ALL valid Acquisition_Records, retrieving the acquisition detail and then listing the equipment IDs SHALL return the same set of IDs as querying `forge_equipment_events` for `PROCURED` events linked to that acquisition's items (round-trip property).
