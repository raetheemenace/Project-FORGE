# DBA Guide - Database Administrator Responsibilities

## Welcome, Database Administrator!

As the DBA for the FORGE project, you're responsible for managing the PostgreSQL database, ensuring data integrity, and supporting the team during development and demo.

## Initial Setup Checklist

### 1. Verify DBeaver Connection
- [ ] Successfully connected to RDS instance
- [ ] Can see the `forge` database
- [ ] Can expand tables and view data

### 2. Run Database Schema (First Time)
1. Open SQL Editor: Right-click `forge` database → SQL Editor → Open SQL Script
2. Navigate to: `backend/db/schema.sql`
3. Execute the script (`Ctrl+Alt+X`)
4. Verify all tables were created (see list below)

### 3. Load Sample Data
1. Open new SQL Editor
2. Load: `backend/db/seed.sql`
3. Execute the script
4. Verify data counts:
```sql
SELECT 'Equipment' AS table_name, COUNT(*) AS count FROM forge_equipment
UNION ALL
SELECT 'Lab Rooms', COUNT(*) FROM forge_lab_rooms
UNION ALL
SELECT 'Users', COUNT(*) FROM forge_users
UNION ALL
SELECT 'Transactions', COUNT(*) FROM forge_transactions
UNION ALL
SELECT 'Transaction Items', COUNT(*) FROM forge_txn_items
UNION ALL
SELECT 'Maintenance Reports', COUNT(*) FROM forge_maintenance
ORDER BY table_name;
```

Expected results:
- Equipment: 70 items
- Lab Rooms: 8 rooms
- Users: 6 users
- Transactions: 3 active
- Transaction Items: 7 items
- Maintenance Reports: 2 reports

## Database Schema Overview

### Core Tables (11 total)

1. **forge_users** - User accounts (students and admins)
2. **forge_equipment** - Lab equipment inventory
3. **forge_transactions** - Borrowing transactions
4. **forge_txn_items** - Equipment items per transaction
5. **forge_lab_rooms** - Laboratory room definitions
6. **forge_maintenance** - Maintenance reports
7. **forge_maintenance_tickets** - Maintenance workflow
8. **forge_scan_log** - AI scanner audit trail
9. **forge_equipment_events** - Equipment lifecycle events
10. **forge_admin_actions** - Admin action audit log
11. **forge_analytics_daily** - Daily analytics rollup

### View Table Structure
```sql
-- See all columns in a table
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'forge_equipment'
ORDER BY ordinal_position;
```

## Daily DBA Tasks

### 1. Monitor Database Health

**Check Active Connections:**
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

**Check Database Size:**
```sql
SELECT pg_size_pretty(pg_database_size('forge')) as database_size;
```

**Check Table Sizes:**
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Verify Data Integrity

**Check for Orphaned Records:**
```sql
-- Transaction items without valid equipment
SELECT * FROM forge_txn_items ti
LEFT JOIN forge_equipment e ON ti.equipment_id = e.equipment_id
WHERE e.equipment_id IS NULL;

-- Transactions without valid users
SELECT * FROM forge_transactions t
LEFT JOIN forge_users u ON t.user_id = u.user_id
WHERE u.user_id IS NULL;
```

**Check Foreign Key Constraints:**
```sql
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 3. Monitor Transactions

**View Active Transactions:**
```sql
SELECT 
    t.txn_id,
    u.full_name,
    t.department,
    t.lab_room,
    t.status,
    t.created_at,
    COUNT(ti.item_id) as item_count
FROM forge_transactions t
JOIN forge_users u ON t.user_id = u.user_id
LEFT JOIN forge_txn_items ti ON t.txn_id = ti.txn_id
WHERE t.status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID')
GROUP BY t.txn_id, u.full_name, t.department, t.lab_room, t.status, t.created_at
ORDER BY t.created_at DESC;
```

**Equipment Currently Borrowed:**
```sql
SELECT 
    e.equipment_id,
    e.name,
    e.department,
    u.full_name as borrowed_by,
    t.txn_id,
    t.time_slot,
    t.lab_room
FROM forge_equipment e
JOIN forge_txn_items ti ON e.equipment_id = ti.equipment_id
JOIN forge_transactions t ON ti.txn_id = t.txn_id
JOIN forge_users u ON t.user_id = u.user_id
WHERE t.status IN ('ACTIVE', 'PENDING_RETURN')
ORDER BY e.equipment_id;
```

## Pre-Demo Preparation

### 1. Backup Current Data
```sql
-- Export all data to SQL file in DBeaver:
-- Right-click database → Tools → Backup
-- Or use pg_dump command
```

### 2. Verify All Systems
```sql
-- Quick health check
SELECT 'Users' AS check_item, COUNT(*) AS count, 
       CASE WHEN COUNT(*) >= 6 THEN '✓ OK' ELSE '✗ ISSUE' END AS status
FROM forge_users
UNION ALL
SELECT 'Equipment', COUNT(*), 
       CASE WHEN COUNT(*) >= 60 THEN '✓ OK' ELSE '✗ ISSUE' END
FROM forge_equipment
UNION ALL
SELECT 'Lab Rooms', COUNT(*), 
       CASE WHEN COUNT(*) >= 8 THEN '✓ OK' ELSE '✗ ISSUE' END
FROM forge_lab_rooms
UNION ALL
SELECT 'Transactions', COUNT(*), 
       CASE WHEN COUNT(*) >= 0 THEN '✓ OK' ELSE '✗ ISSUE' END
FROM forge_transactions;
```

### 3. Reset Demo Data (if needed)
```sql
-- Clear all transactions but keep equipment and rooms
TRUNCATE TABLE forge_txn_items CASCADE;
TRUNCATE TABLE forge_transactions CASCADE;
TRUNCATE TABLE forge_scan_log CASCADE;

-- Or re-run the entire seed.sql file to reset everything
```

### 4. Create Test User for Demo
```sql
-- Add a demo user (password will be hashed by backend during signup)
-- This is just for reference - actual users should sign up via the app
INSERT INTO forge_users (student_id, username, password_hash, full_name, program, role)
VALUES ('2024999', 'demo.user', '$2b$10$placeholder', 'Demo User', 'BS Computer Engineering', 'STUDENT');
```

## During Demo Support

### Monitor Live Activity
Keep this query running to see new data as it's created:

```sql
-- Refresh every few seconds to see new signups
SELECT user_id, username, full_name, program, created_at
FROM forge_users
ORDER BY created_at DESC
LIMIT 10;

-- See new transactions
SELECT txn_id, user_id, department, lab_room, status, created_at
FROM forge_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Quick Queries for Professor

**Show Total Records:**
```sql
SELECT 
    (SELECT COUNT(*) FROM forge_users) as total_users,
    (SELECT COUNT(*) FROM forge_equipment) as total_equipment,
    (SELECT COUNT(*) FROM forge_lab_rooms) as total_rooms,
    (SELECT COUNT(*) FROM forge_transactions) as total_transactions;
```

**Show Recent Activity:**
```sql
SELECT 
    'User Signup' as activity_type,
    full_name as details,
    created_at
FROM forge_users
UNION ALL
SELECT 
    'Transaction',
    txn_id || ' - ' || lab_room,
    created_at
FROM forge_transactions
ORDER BY created_at DESC
LIMIT 20;
```

**Show Equipment by Department:**
```sql
SELECT 
    department,
    COUNT(*) as equipment_count,
    SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
    SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance
FROM forge_equipment
GROUP BY department
ORDER BY department;
```

## Common DBA Operations

### Add New Equipment
```sql
INSERT INTO forge_equipment (equipment_id, name, department, status)
VALUES ('EQ-9999', 'New Equipment Name', 'Computer Engineering', 'AVAILABLE');
```

### Update Equipment Status
```sql
UPDATE forge_equipment
SET status = 'MAINTENANCE'
WHERE equipment_id = 'EQ-3003';
```

### Add New Lab Room
```sql
INSERT INTO forge_lab_rooms (room_id, room_name, department, capacity, status)
VALUES ('E-501', 'Advanced Computing Lab', 'Computer Engineering', 30, 'ACTIVE');
```

### View User Details
```sql
SELECT 
    u.user_id,
    u.student_id,
    u.username,
    u.full_name,
    u.program,
    u.role,
    COUNT(t.txn_id) as total_transactions
FROM forge_users u
LEFT JOIN forge_transactions t ON u.user_id = t.user_id
GROUP BY u.user_id, u.student_id, u.username, u.full_name, u.program, u.role
ORDER BY u.created_at DESC;
```

### Find Specific Transaction
```sql
SELECT 
    t.*,
    u.full_name,
    json_agg(json_build_object(
        'equipment_id', e.equipment_id,
        'name', e.name,
        'condition', ti.condition
    )) as items
FROM forge_transactions t
JOIN forge_users u ON t.user_id = u.user_id
LEFT JOIN forge_txn_items ti ON t.txn_id = ti.txn_id
LEFT JOIN forge_equipment e ON ti.equipment_id = e.equipment_id
WHERE t.txn_id = 'TXN-20260322-001'
GROUP BY t.txn_id, u.full_name;
```

## Troubleshooting

### Issue: Tables Don't Exist
**Solution:** Run `backend/db/schema.sql` first

### Issue: No Data in Tables
**Solution:** Run `backend/db/seed.sql`

### Issue: Foreign Key Violation
**Solution:** Check that referenced records exist first
```sql
-- Example: Before adding transaction item, verify equipment exists
SELECT * FROM forge_equipment WHERE equipment_id = 'EQ-1001';
```

### Issue: Duplicate Key Error
**Solution:** Check if record already exists
```sql
SELECT * FROM forge_equipment WHERE equipment_id = 'EQ-1001';
-- If exists, use UPDATE instead of INSERT
```

### Issue: Connection Lost
**Solution:** 
1. Check internet connection
2. Verify RDS instance is running in AWS Console
3. Reconnect in DBeaver (right-click connection → Connect)

## Performance Optimization

### Check Slow Queries
```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Analyze Table Statistics
```sql
ANALYZE forge_equipment;
ANALYZE forge_transactions;
-- Run for all tables
```

### Vacuum Tables (Clean up)
```sql
VACUUM ANALYZE forge_equipment;
VACUUM ANALYZE forge_transactions;
```

## Security Responsibilities

### Monitor User Access
```sql
SELECT 
    usename,
    application_name,
    client_addr,
    state,
    query_start
FROM pg_stat_activity
WHERE datname = 'forge'
ORDER BY query_start DESC;
```

### Check User Permissions
```sql
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY grantee, table_name;
```

## Backup and Recovery

### Manual Backup in DBeaver
1. Right-click database → **Tools** → **Backup**
2. Choose location and format
3. Click **Start**

### Restore from Backup
1. Right-click database → **Tools** → **Restore**
2. Select backup file
3. Click **Start**

### Export Specific Table
1. Right-click table → **Export Data**
2. Choose CSV or SQL format
3. Save file

## Post-Demo Tasks

### 1. Review What Was Created
```sql
-- Check new users from demo
SELECT * FROM forge_users 
WHERE created_at > '2026-03-22 00:00:00'
ORDER BY created_at;

-- Check new transactions
SELECT * FROM forge_transactions
WHERE created_at > '2026-03-22 00:00:00'
ORDER BY created_at;
```

### 2. Generate Report for Professor
```sql
-- Summary report
SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM forge_users
UNION ALL
SELECT 'Total Equipment', COUNT(*)::text FROM forge_equipment
UNION ALL
SELECT 'Total Transactions', COUNT(*)::text FROM forge_transactions
UNION ALL
SELECT 'Active Transactions', COUNT(*)::text 
FROM forge_transactions WHERE status IN ('ACTIVE', 'PENDING_RETURN')
UNION ALL
SELECT 'Lab Rooms', COUNT(*)::text FROM forge_lab_rooms;
```

### 3. Backup Final State
Create a backup of the database after the demo for records.

## Quick Reference Commands

```sql
-- Count all records
SELECT COUNT(*) FROM forge_equipment;

-- View recent entries
SELECT * FROM forge_users ORDER BY created_at DESC LIMIT 10;

-- Search equipment
SELECT * FROM forge_equipment WHERE name ILIKE '%beaker%';

-- Check table structure
\d forge_equipment  -- In psql
-- Or in DBeaver: Right-click table → View Table

-- Clear specific table
TRUNCATE TABLE forge_transactions CASCADE;

-- Reset auto-increment
ALTER SEQUENCE forge_users_user_id_seq RESTART WITH 1;
```

## Contact Points

- **Backend Developer:** For API/database integration issues
- **Frontend Developer:** For data display issues
- **AWS Admin:** For RDS access or performance issues
- **Team Lead:** For schema changes or major decisions

## Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- DBeaver Documentation: https://dbeaver.com/docs/
- Project Schema: `backend/db/schema.sql`
- Sample Data: `backend/db/seed.sql`

## DBA Checklist Summary

**Before Demo:**
- [ ] Database schema created
- [ ] Seed data loaded (60+ equipment records)
- [ ] All tables verified
- [ ] Backup created
- [ ] Test queries prepared

**During Demo:**
- [ ] Monitor new user signups
- [ ] Watch for transaction creation
- [ ] Have summary queries ready
- [ ] Be ready to show data to professor

**After Demo:**
- [ ] Review created data
- [ ] Generate final report
- [ ] Create backup
- [ ] Document any issues

Good luck with your demo! 🚀
