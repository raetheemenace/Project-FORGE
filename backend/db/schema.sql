-- FORGE System Database Schema
-- PostgreSQL compatible schema for lab equipment management

-- Users table
CREATE TABLE forge_users (
    user_id       SERIAL PRIMARY KEY,
    student_id    CHAR(7) UNIQUE NOT NULL,  -- 7-digit numeric student ID (primary identifier)
    username      VARCHAR(100) UNIQUE,      -- Optional (for backward compatibility)
    password_hash VARCHAR(255),             -- Optional (for backward compatibility)
    full_name     VARCHAR(200) NOT NULL,
    program       VARCHAR(200),
    role          VARCHAR(20) DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'LAB_ADMIN')),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment table
CREATE TABLE forge_equipment (
    equipment_id  VARCHAR(20) PRIMARY KEY,  -- e.g. EQ-7167
    name          VARCHAR(200) NOT NULL,
    department    VARCHAR(50) NOT NULL,
    s3_image_key  VARCHAR(500),
    status        VARCHAR(20) DEFAULT 'AVAILABLE'
);

-- Transactions table
CREATE TABLE forge_transactions (
    txn_id        VARCHAR(30) PRIMARY KEY,  -- TXN-YYYYMMDD-NNN
    user_id       INTEGER REFERENCES forge_users(user_id),
    department    VARCHAR(50) NOT NULL,
    course        VARCHAR(100) NOT NULL,
    time_slot     VARCHAR(50) NOT NULL,
    txn_date      DATE NOT NULL,
    lab_room      VARCHAR(20) NOT NULL,
    adviser       VARCHAR(200) NOT NULL,
    status        VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED')),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction items (equipment per transaction)
CREATE TABLE forge_txn_items (
    item_id       SERIAL PRIMARY KEY,
    txn_id        VARCHAR(30) REFERENCES forge_transactions(txn_id),
    equipment_id  VARCHAR(20) REFERENCES forge_equipment(equipment_id),
    condition     VARCHAR(20) CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor'))
);

-- Maintenance reports table
CREATE TABLE forge_maintenance (
    report_id     SERIAL PRIMARY KEY,
    equipment_id  VARCHAR(20) REFERENCES forge_equipment(equipment_id),
    user_id       INTEGER REFERENCES forge_users(user_id),
    severity      VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    description   TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI scan audit log (lightweight Bedrock call record)
CREATE TABLE forge_scan_log (
    scan_id           SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES forge_users(user_id),
    txn_id            VARCHAR(30) REFERENCES forge_transactions(txn_id),  -- Nullable; set after transaction is committed
    equipment_id      VARCHAR(20) REFERENCES forge_equipment(equipment_id),  -- Nullable; resolved equipment ID if match found
    s3_image_key      VARCHAR(500),          -- S3 key of the captured image sent to Bedrock
    bedrock_response  TEXT,                  -- Raw JSON response from Claude 3
    predicted_name    VARCHAR(200),          -- Top predicted equipment name
    confidence_score  DECIMAL(5,2),          -- e.g. 95.50
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab rooms table
CREATE TABLE forge_lab_rooms (
    room_id       VARCHAR(20) PRIMARY KEY,  -- e.g. A-101, B-205
    room_name     VARCHAR(200) NOT NULL,
    department    VARCHAR(50) NOT NULL,
    capacity      INTEGER,
    status        VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE'))
);

-- Equipment lifecycle events (procurement, transfer, disposal)
CREATE TABLE forge_equipment_events (
    event_id      SERIAL PRIMARY KEY,
    equipment_id  VARCHAR(20) REFERENCES forge_equipment(equipment_id),
    event_type    VARCHAR(20) CHECK (event_type IN ('PROCURED', 'TRANSFERRED', 'DISPOSED', 'CALIBRATED')),
    performed_by  INTEGER REFERENCES forge_users(user_id),
    from_location VARCHAR(200),  -- For transfers
    to_location   VARCHAR(200),  -- For transfers
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin action audit trail
CREATE TABLE forge_admin_actions (
    action_id     SERIAL PRIMARY KEY,
    admin_id      INTEGER REFERENCES forge_users(user_id),
    action_type   VARCHAR(50) NOT NULL,  -- e.g. 'EQUIPMENT_CREATED', 'USER_DISABLED', 'TRANSACTION_OVERRIDDEN'
    target_type   VARCHAR(50),  -- e.g. 'EQUIPMENT', 'USER', 'TRANSACTION'
    target_id     VARCHAR(100),  -- ID of affected entity
    details       TEXT,  -- JSON or text description
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance ticket workflow
CREATE TABLE forge_maintenance_tickets (
    ticket_id     SERIAL PRIMARY KEY,
    report_id     INTEGER REFERENCES forge_maintenance(report_id),
    assigned_to   INTEGER REFERENCES forge_users(user_id),  -- Nullable; admin or technician
    status        VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority      VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    resolution    TEXT,
    resolved_at   TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System analytics aggregation (daily rollup)
CREATE TABLE forge_analytics_daily (
    analytics_id      SERIAL PRIMARY KEY,
    report_date       DATE NOT NULL,
    department        VARCHAR(50),
    total_transactions INTEGER DEFAULT 0,
    total_equipment_borrowed INTEGER DEFAULT 0,
    total_maintenance_reports INTEGER DEFAULT 0,
    avg_session_duration INTEGER,  -- In minutes
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (report_date, department)
);

-- Create indexes for common queries
CREATE INDEX idx_users_student_id ON forge_users(student_id);
CREATE INDEX idx_transactions_user_id ON forge_transactions(user_id);
CREATE INDEX idx_transactions_date ON forge_transactions(txn_date);
CREATE INDEX idx_txn_items_txn_id ON forge_txn_items(txn_id);
CREATE INDEX idx_maintenance_equipment ON forge_maintenance(equipment_id);
CREATE INDEX idx_scan_log_user ON forge_scan_log(user_id);
CREATE INDEX idx_equipment_events_equipment ON forge_equipment_events(equipment_id);
CREATE INDEX idx_admin_actions_admin ON forge_admin_actions(admin_id);
CREATE INDEX idx_tickets_report ON forge_maintenance_tickets(report_id);
CREATE INDEX idx_analytics_date_dept ON forge_analytics_daily(report_date, department);

-- Acquisition workflow tables
CREATE TABLE forge_acquisitions (
    acquisition_id  SERIAL PRIMARY KEY,
    supplier_name   VARCHAR(200) NOT NULL,
    acquisition_date DATE NOT NULL,
    notes           TEXT,
    created_by      INTEGER NOT NULL REFERENCES forge_users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acquisitions_date ON forge_acquisitions(acquisition_date DESC);
CREATE INDEX idx_acquisitions_created_by ON forge_acquisitions(created_by);

CREATE TABLE forge_acquisition_items (
    item_id         SERIAL PRIMARY KEY,
    acquisition_id  INTEGER NOT NULL REFERENCES forge_acquisitions(acquisition_id),
    equipment_id    VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    initial_condition VARCHAR(20) CHECK (initial_condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
    assigned_room   VARCHAR(20) REFERENCES forge_lab_rooms(room_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acq_items_acquisition ON forge_acquisition_items(acquisition_id);
CREATE INDEX idx_acq_items_equipment ON forge_acquisition_items(equipment_id);
