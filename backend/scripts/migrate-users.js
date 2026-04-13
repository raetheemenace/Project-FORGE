/**
 * Migration: fix forge_users for signup compatibility.
 * Run with: node backend/scripts/migrate-users.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db/pool');

async function migrate() {
  try {
    await db.initialize();

    await db.query(`ALTER TABLE forge_users ALTER COLUMN student_id TYPE VARCHAR(8)`);
    console.log('✓ student_id widened to VARCHAR(8)');

    await db.query(`ALTER TABLE forge_users ADD COLUMN IF NOT EXISTS tip_email VARCHAR(200) UNIQUE`);
    console.log('✓ tip_email column ensured');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

migrate();
