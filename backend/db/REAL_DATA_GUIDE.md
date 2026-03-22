# Adding Real Data to FORGE

## Overview

For production use, you'll want real equipment inventory, actual lab rooms, and registered users instead of sample data.

## Method 1: Admin Interface (Recommended)

Build admin pages to manage data through the UI:

### Equipment Management
- Create form: Equipment ID, Name, Department, Upload Image to S3
- Bulk import option for CSV files
- Edit/delete existing equipment

### Lab Room Management
- Add rooms with ID, name, department, capacity
- Set room status (ACTIVE/MAINTENANCE/INACTIVE)

### User Management
- Students register via signup page
- Admins can manually add users or import from student database

## Method 2: CSV Import Script

If you have existing inventory in Excel/Google Sheets:

### Step 1: Prepare CSV File

Create a CSV file with your equipment data:

```csv
equipment_id,name,department,status
EQ-1001,Oscilloscope Tektronix TDS2024C,Computer Engineering,AVAILABLE
EQ-1002,Function Generator Agilent 33220A,Computer Engineering,AVAILABLE
EQ-2001,Spectrum Analyzer Keysight N9320B,Electronics Engineering,AVAILABLE
```

Template file: `backend/db/import-template.csv`

### Step 2: Run Import Script

```bash
cd backend
node scripts/import-equipment.js path/to/your-equipment.csv
```

The script will:
- Read your CSV file
- Insert equipment into the database
- Skip duplicates or update existing records
- Show progress and errors

### Step 3: Verify Import

```sql
SELECT COUNT(*) FROM forge_equipment;
SELECT * FROM forge_equipment ORDER BY equipment_id;
```

## Method 3: Direct SQL Insert

For one-time bulk inserts, write SQL directly:

```sql
-- Insert your actual lab rooms
INSERT INTO forge_lab_rooms (room_id, room_name, department, capacity, status) VALUES
('A-101', 'Computer Laboratory 1', 'Computer Engineering', 40, 'ACTIVE'),
('B-201', 'Electronics Laboratory', 'Electronics Engineering', 30, 'ACTIVE');

-- Insert your actual equipment
INSERT INTO forge_equipment (equipment_id, name, department, status) VALUES
('EQ-1001', 'Oscilloscope Tektronix TDS2024C', 'Computer Engineering', 'AVAILABLE'),
('EQ-1002', 'Function Generator Agilent 33220A', 'Computer Engineering', 'AVAILABLE');
```

## Method 4: API Endpoints

Use the existing admin API endpoints to add data programmatically:

### Add Equipment
```bash
curl -X POST http://localhost:5000/api/admin/equipment \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentId": "EQ-1001",
    "name": "Oscilloscope Tektronix TDS2024C",
    "department": "Computer Engineering",
    "status": "AVAILABLE"
  }'
```

### Add Lab Room
```bash
curl -X POST http://localhost:5000/api/admin/rooms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "A-101",
    "roomName": "Computer Laboratory 1",
    "department": "Computer Engineering",
    "capacity": 40
  }'
```

## Data Collection Workflow

### For TIP-Manila Implementation:

1. **Inventory Audit**
   - Walk through each lab with a spreadsheet
   - Record: Equipment ID, Name, Department, Current Location
   - Take photos for S3 upload

2. **Lab Room Survey**
   - List all lab rooms with IDs
   - Note capacity and current status
   - Assign to departments

3. **User Registration**
   - Students sign up via the app
   - Import existing student database if available
   - Designate lab admins

4. **Equipment Photos**
   - Upload high-res images to S3
   - Update equipment records with S3 keys
   - Used for AI identification training

## Recommended Approach

**Phase 1: Initial Setup**
- Use seed.sql for development/testing
- Build admin interface for equipment management
- Test workflows with sample data

**Phase 2: Data Migration**
- Export current inventory to CSV
- Run import script to populate database
- Upload equipment photos to S3
- Verify data accuracy

**Phase 3: Production**
- Students register via signup
- Lab admins add new equipment through UI
- System tracks real transactions
- Regular backups and audits

## Equipment ID Convention

Suggested format: `EQ-XXXX` where XXXX is a sequential number

Examples:
- `EQ-1001` to `EQ-1999` - Computer Engineering
- `EQ-2001` to `EQ-2999` - Electronics Engineering
- `EQ-3001` to `EQ-3999` - Mechanical Engineering
- `EQ-4001` to `EQ-4999` - Civil Engineering

## Lab Room ID Convention

Format: `BUILDING-ROOM` 

Examples:
- `A-101`, `A-102` - Building A
- `B-201`, `B-202` - Building B
- `LAB-CE-01` - Alternative format

## Next Steps

1. Decide on your data entry method
2. Prepare your equipment inventory list
3. Set up admin accounts
4. Begin data entry through chosen method
5. Verify data appears correctly in dashboard
