-- Migration: add total_quantity to forge_equipment
-- Allows admins to set the total stock count per equipment unit,
-- which is displayed on the student Dashboard high-demand panel.

ALTER TABLE forge_equipment
  ADD COLUMN IF NOT EXISTS total_quantity INTEGER NOT NULL DEFAULT 1 CHECK (total_quantity >= 1);
