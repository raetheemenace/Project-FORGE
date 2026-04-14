/**
 * One-time migration runner: adds total_quantity column to forge_equipment.
 * Run with: node backend/scripts/run-migration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db/pool');

async function migrate() {
  try {
    await db.initialize();
    await db.query(`
      ALTER TABLE forge_equipment
        ADD COLUMN IF NOT EXISTS total_quantity INTEGER NOT NULL DEFAULT 1
        CHECK (total_quantity >= 1)
    `);
    console.log('Migration complete: total_quantity column added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

migrate();
