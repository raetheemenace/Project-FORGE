-- SAFE: No data loss at all
-- Create index for department searches
CREATE INDEX IF NOT EXISTS idx_equipment_department ON forge_equipment(department);