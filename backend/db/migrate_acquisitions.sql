-- Migration: Add acquisition workflow tables
-- Run this if forge_acquisitions / forge_acquisition_requests don't exist yet

CREATE TABLE IF NOT EXISTS forge_acquisitions (
    acquisition_id  SERIAL PRIMARY KEY,
    supplier_name   VARCHAR(200) NOT NULL,
    acquisition_date DATE NOT NULL,
    notes           TEXT,
    created_by      INTEGER NOT NULL REFERENCES forge_users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acquisitions_date ON forge_acquisitions(acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_acquisitions_created_by ON forge_acquisitions(created_by);

CREATE TABLE IF NOT EXISTS forge_acquisition_items (
    item_id         SERIAL PRIMARY KEY,
    acquisition_id  INTEGER NOT NULL REFERENCES forge_acquisitions(acquisition_id),
    equipment_id    VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    initial_condition VARCHAR(20) CHECK (initial_condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
    assigned_room   VARCHAR(20) REFERENCES forge_lab_rooms(room_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acq_items_acquisition ON forge_acquisition_items(acquisition_id);
CREATE INDEX IF NOT EXISTS idx_acq_items_equipment ON forge_acquisition_items(equipment_id);

CREATE TABLE IF NOT EXISTS forge_acquisition_requests (
    request_id    SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES forge_users(user_id),
    equipment_name VARCHAR(200) NOT NULL,
    department    VARCHAR(50) NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    reason        TEXT NOT NULL,
    urgency       VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED')),
    admin_notes   TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acq_requests_user ON forge_acquisition_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_acq_requests_status ON forge_acquisition_requests(status);
CREATE INDEX IF NOT EXISTS idx_acq_requests_created ON forge_acquisition_requests(created_at DESC);

-- Migration: Add equipment_id field to acquisition requests
ALTER TABLE forge_acquisition_requests
  ADD COLUMN IF NOT EXISTS equipment_id VARCHAR(20);
