// Import equipment from CSV file
// Usage: node backend/scripts/import-equipment.js path/to/equipment.csv

const fs = require('fs');
const path = require('path');
const db = require('../db/pool');

async function importEquipment(csvPath) {
  try {
    await db.initialize();
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const [equipmentId, name, department, status] = values;
      
      if (!equipmentId || !name || !department) {
        console.log(`Skipping line ${i + 1}: Missing required fields`);
        skipped++;
        continue;
      }
      
      try {
        await db.query(
          `INSERT INTO forge_equipment (equipment_id, name, department, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (equipment_id) DO UPDATE
           SET name = $2, department = $3, status = $4`,
          [equipmentId.trim(), name.trim(), department.trim(), status?.trim() || 'AVAILABLE']
        );
        console.log(`✓ Imported: ${equipmentId} - ${name}`);
        imported++;
      } catch (err) {
        console.error(`✗ Error importing ${equipmentId}:`, err.message);
        skipped++;
      }
    }
    
    console.log(`\nImport complete: ${imported} imported, ${skipped} skipped`);
    await db.close();
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node import-equipment.js path/to/equipment.csv');
  process.exit(1);
}

importEquipment(csvPath);
