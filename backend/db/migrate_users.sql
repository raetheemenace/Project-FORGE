-- Migration: fix forge_users for signup compatibility
-- 1. Widen student_id from CHAR(7) to VARCHAR(8) to support 7-8 digit IDs
-- 2. Add tip_email column if it doesn't exist

ALTER TABLE forge_users
  ALTER COLUMN student_id TYPE VARCHAR(8);

ALTER TABLE forge_users
  ADD COLUMN IF NOT EXISTS tip_email VARCHAR(200) UNIQUE;
