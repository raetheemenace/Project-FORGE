-- Remove the incorrect columns that were added by mistake
ALTER TABLE forge_equipment DROP COLUMN IF EXISTS total_units;
ALTER TABLE forge_equipment DROP COLUMN IF EXISTS available_units;

-- Verify the correct existing columns are present
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'forge_equipment' AND column_name LIKE '%quantity%';

-- ✓ Correct existing columns:
-- total_quantity - exists in database
-- There is NO available_units column
-- Availability is calculated based on status and active transactions