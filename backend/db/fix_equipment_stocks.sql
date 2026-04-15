-- FIX 1: Update all equipment to have proper stock counts
UPDATE forge_equipment 
SET 
  total_units = 1,
  available_units = CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END;

-- FIX 2: Add index for department searches
CREATE INDEX IF NOT EXISTS idx_equipment_department ON forge_equipment(department);

-- Verify
SELECT 
  department, 
  COUNT(*) as equipment_count,
  SUM(total_units) as total_units,
  SUM(available_units) as available_units
FROM forge_equipment
GROUP BY department
ORDER BY department;