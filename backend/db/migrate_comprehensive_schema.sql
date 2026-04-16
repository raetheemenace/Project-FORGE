-- ============================================================================
-- FORGE SYSTEM COMPREHENSIVE MIGRATION
-- ============================================================================
-- This script adds all new tables and migrates existing data to 3NF.
-- Run this ONCE on your production database after backing up.
-- ============================================================================

-- ############################################################################
-- PHASE 0: Helper Functions
-- ############################################################################

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ############################################################################
-- PHASE 1: Create New Reference Tables (No data dependencies)
-- ############################################################################

-- Table: forge_departments
CREATE TABLE IF NOT EXISTS forge_departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    default_lab_room VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: forge_suppliers
CREATE TABLE IF NOT EXISTS forge_suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: forge_system_settings
CREATE TABLE IF NOT EXISTS forge_system_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    updated_by INTEGER REFERENCES forge_users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ############################################################################
-- PHASE 2: Create Junction & Log Tables
-- ############################################################################

-- Table: forge_equipment_departments (Many-to-Many Equipment ↔ Department)
CREATE TABLE IF NOT EXISTS forge_equipment_departments (
    equipment_id VARCHAR(20) NOT NULL,
    department_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,  -- For equipment that primarily belongs to one department
    assigned_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    PRIMARY KEY (equipment_id, department_id),
    CONSTRAINT forge_equipment_departments_equipment_id_fkey FOREIGN KEY (equipment_id)
        REFERENCES public.forge_equipment(equipment_id) ON DELETE CASCADE,
    CONSTRAINT forge_equipment_departments_department_id_fkey FOREIGN KEY (department_id)
        REFERENCES public.forge_departments(department_id) ON DELETE CASCADE
);

-- Table: forge_borrow_log
CREATE TABLE IF NOT EXISTS forge_borrow_log (
    borrow_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES forge_users(user_id),
    equipment_id VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    txn_id VARCHAR(30) REFERENCES forge_transactions(txn_id),
    condition_before VARCHAR(50),
    borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Table: forge_return_log
CREATE TABLE IF NOT EXISTS forge_return_log (
    return_id SERIAL PRIMARY KEY,
    borrow_id INTEGER NOT NULL REFERENCES forge_borrow_log(borrow_id),
    user_id INTEGER NOT NULL REFERENCES forge_users(user_id),
    equipment_id VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    condition_after VARCHAR(50),
    remarks_in TEXT,
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: forge_inventory_audit
CREATE TABLE IF NOT EXISTS forge_inventory_audit (
    audit_id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    audit_date DATE NOT NULL,
    expected_quantity INTEGER DEFAULT 1,
    actual_quantity INTEGER DEFAULT 1,
    discrepancy_note TEXT,
    audited_by INTEGER NOT NULL REFERENCES forge_users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: forge_calibration_log
CREATE TABLE IF NOT EXISTS forge_calibration_log (
    calibration_id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) NOT NULL REFERENCES forge_equipment(equipment_id),
    calibration_date DATE NOT NULL,
    due_date DATE,
    performed_by INTEGER REFERENCES forge_users(user_id),
    certificate_number VARCHAR(100),
    result VARCHAR(50) CHECK (result IN ('Pass', 'Fail', 'Pending', 'In Progress')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: forge_user_sessions
CREATE TABLE IF NOT EXISTS forge_user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES forge_users(user_id) ON DELETE CASCADE,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_timestamp TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_token VARCHAR(255) UNIQUE,
    refresh_token VARCHAR(255)
);

-- ############################################################################
-- PHASE 3: Migrate Department Data (Data Migration)
-- ############################################################################

-- Step 3.1: Extract distinct departments from existing equipment and lab_rooms
-- and insert into forge_departments (if not already present)
INSERT INTO forge_departments (department_name, default_lab_room, notes)
SELECT DISTINCT
    e.department,
    NULL as default_lab_room,
    'Migrated from forge_equipment' as notes
FROM forge_equipment e
WHERE e.department IS NOT NULL
  AND e.department <> ''
  AND NOT EXISTS (
      SELECT 1 FROM forge_departments d
      WHERE d.department_name = e.department
  )
ON CONFLICT (department_name) DO NOTHING;

-- Also migrate departments from lab_rooms
INSERT INTO forge_departments (department_name, default_lab_room, notes)
SELECT DISTINCT
    lr.department,
    lr.room_id as default_lab_room,  -- Use first lab room as default for dept
    'Migrated from forge_lab_rooms' as notes
FROM forge_lab_rooms lr
WHERE lr.department IS NOT NULL
  AND lr.department <> ''
  AND NOT EXISTS (
      SELECT 1 FROM forge_departments d
      WHERE d.department_name = lr.department
  )
ON CONFLICT (department_name) DO NOTHING;

-- Step 3.2: Populate forge_equipment_departments from existing equipment.department
-- This establishes the many-to-many relationship (1-to-1 initially)
INSERT INTO forge_equipment_departments (equipment_id, department_id, is_primary, assigned_date)
SELECT
    e.equipment_id,
    d.department_id,
    TRUE as is_primary,
    CURRENT_DATE as assigned_date
FROM forge_equipment e
JOIN forge_departments d ON d.department_name = e.department
WHERE NOT EXISTS (
    SELECT 1 FROM forge_equipment_departments ed
    WHERE ed.equipment_id = e.equipment_id
);

-- ############################################################################
-- PHASE 4: ALTER TABLEs - Modify Existing Schema (Non-breaking additions)
-- ############################################################################

-- Step 4.1: Add department_id FK to forge_equipment (nullable initially)
ALTER TABLE forge_equipment
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES forge_departments(department_id);

-- Step 4.2: Populate department_id from junction table (for forward queries)
UPDATE forge_equipment e
SET department_id = d.department_id
FROM forge_equipment_departments ed
JOIN forge_departments d ON d.department_id = ed.department_id
WHERE e.equipment_id = ed.equipment_id
  AND ed.is_primary = TRUE
  AND e.department_id IS NULL;

-- Step 4.3: Add supplier_id to forge_acquisitions (for future supplier linkage)
ALTER TABLE forge_acquisitions
    ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES forge_suppliers(supplier_id);

-- Step 4.4: Add calibration_required flag to equipment (for tracking)
ALTER TABLE forge_equipment
    ADD COLUMN IF NOT EXISTS calibration_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_calibration_date DATE,
    ADD COLUMN IF NOT EXISTS next_calibration_date DATE;

-- Step 4.5: Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_equipment_department_id ON forge_equipment(department_id);
CREATE INDEX IF NOT EXISTS idx_acquisitions_supplier ON forge_acquisitions(supplier_id);

-- ############################################################################
-- PHASE 5: Populate Borrow/Return Logs from Existing Transactions
-- ############################################################################

-- This populates historical borrow logs from completed/active transactions
-- Note: This is a best-effort migration; exact condition_before is unknown
INSERT INTO forge_borrow_log (user_id, equipment_id, txn_id, condition_before, borrowed_at)
SELECT
    t.user_id,
    ti.equipment_id,
    t.txn_id,
    'Good' as condition_before,  -- Default assumption
    t.created_at as borrowed_at
FROM forge_transactions t
JOIN forge_txn_items ti ON ti.txn_id = t.txn_id
WHERE t.status IN ('ACTIVE', 'RETURNED')
  AND NOT EXISTS (
      SELECT 1 FROM forge_borrow_log bl
      WHERE bl.txn_id = t.txn_id
        AND bl.equipment_id = ti.equipment_id
  );

-- Return logs for returned transactions (requires mapping txn → return event)
-- Note: Without explicit return timestamps, we'll create placeholders.
-- The actual return timestamp is not stored in current schema, so we skip this
-- or mark with a generic timestamp. Ideally, add a returned_at column to transactions first.

-- ############################################################################
-- PHASE 6: Create Triggers
-- ############################################################################

-- Trigger: Update updated_at on forge_acquisition_requests
DROP TRIGGER IF EXISTS trg_update_acquisition_requests_timestamp ON forge_acquisition_requests;
CREATE TRIGGER trg_update_acquisition_requests_timestamp
    BEFORE UPDATE ON forge_acquisition_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- PHASE 7: Final Indexes (Performance)
-- ############################################################################

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_departments_name ON forge_departments(department_name);
CREATE INDEX IF NOT EXISTS idx_equipment_departments_department ON forge_equipment_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_borrow_log_user ON forge_borrow_log(user_id);
CREATE INDEX IF NOT EXISTS idx_borrow_log_equipment ON forge_borrow_log(equipment_id);
CREATE INDEX IF NOT EXISTS idx_borrow_log_borrowed_at ON forge_borrow_log(borrowed_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_log_borrow ON forge_return_log(borrow_id);
CREATE INDEX IF NOT EXISTS idx_return_log_user ON forge_return_log(user_id);
CREATE INDEX IF NOT EXISTS idx_return_log_equipment ON forge_return_log(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_equipment ON forge_inventory_audit(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_date ON forge_inventory_audit(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_log_equipment ON forge_calibration_log(equipment_id);
CREATE INDEX IF NOT EXISTS idx_calibration_log_due_date ON forge_calibration_log(due_date);
CREATE INDEX IF NOT EXISTS idx_calibration_log_result ON forge_calibration_log(result);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON forge_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON forge_user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON forge_system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON forge_suppliers(supplier_name);

-- ############################################################################
-- PHASE 8: Seed Default Data
-- ############################################################################

-- Insert sample departments (if empty)
INSERT INTO forge_departments (department_name, notes)
VALUES
    ('Chemistry', 'Chemistry laboratory'),
    ('Physics', 'Physics laboratory'),
    ('Biology', 'Biology laboratory'),
    ('Computer Science', 'CS Lab'),
    ('Mechanical Engineering', 'ME Workshop')
ON CONFLICT (department_name) DO NOTHING;

-- Insert default system settings
INSERT INTO forge_system_settings (setting_key, setting_value, description)
VALUES
    ('max_borrow_days', '7', 'Maximum number of days a student can borrow equipment'),
    ('calibration_reminder_days', '30', 'Days before calibration due to send reminder'),
    ('late_fee_per_day', '10', 'Late fee amount per day (institution currency'),
    ('auto_approve_requests', 'false', 'Automatically approve student acquisition requests')
ON CONFLICT (setting_key) DO NOTHING;

-- ############################################################################
-- PHASE 9: Migration Notes & Verification Queries
-- ############################################################################

-- NOTE: After running this migration, update your application code to:
-- 1. Use forge_departments instead of text department fields
-- 2. Log all borrows to forge_borrow_log
-- 3. Log all returns to forge_return_log
-- 4. Check forge_calibration_log before allowing borrow (if calibration_required=TRUE)
-- 5. Use forge_department_id foreign key in forge_equipment for relationships
-- 6. Deprecate the department column in forge_equipment (keep for backward compatibility temporarily)
-- 7. Lab rooms can reference departments via department_id FK (optional future change)

-- VERIFICATION: Run these queries to confirm migration success

-- 1. Check department count
-- SELECT COUNT(*) as total_departments FROM forge_departments;

-- 2. Check equipment-department mapping coverage
-- SELECT COUNT(*) as unmapped_equipment
-- FROM forge_equipment e
-- LEFT JOIN forge_equipment_departments ed ON ed.equipment_id = e.equipment_id
-- WHERE ed.equipment_id IS NULL;

-- 3. Check borrow log count
-- SELECT COUNT(*) as total_borrow_logs FROM forge_borrow_log;

-- 4. Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename LIKE 'forge_%'
-- ORDER BY tablename, indexname;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
