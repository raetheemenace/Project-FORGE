# FORGE Database Setup

## PostgreSQL Schema

This directory contains the database schema and connection pool configuration for the FORGE system using PostgreSQL 17.6-R2.

## Files

- `schema.sql` - Complete PostgreSQL database schema with all tables and indexes
- `pool.js` - PostgreSQL connection pool configuration and management

## Setup Instructions

### 1. Create PostgreSQL RDS Instance

1. Log into AWS Console
2. Navigate to RDS
3. Create a new PostgreSQL instance:
   - Engine: PostgreSQL 17.6-R2
   - Template: Free tier (db.t3.micro)
   - DB instance identifier: `forge-db`
   - Master username: `postgres`
   - Master password: (create a strong password)
   - Public access: Yes
   - Initial database name: `forge`
4. Note the endpoint, username, and password

### 2. Configure Environment Variables

Update `backend/.env` with your PostgreSQL RDS credentials:

```env
DB_USER=postgres
DB_PASSWORD=your_rds_password
DB_CONNECTION_STRING=forge-db.xxxxx.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=forge
```

### 3. Run Schema Creation

Connect to your PostgreSQL instance using psql or any PostgreSQL client:

#### Using psql (Command Line):
```bash
psql -h forge-db.xxxxx.ap-southeast-1.rds.amazonaws.com -U postgres -d forge -f backend/db/schema.sql
```

#### Using pgAdmin (GUI):
1. Create a new server connection
2. Enter your RDS endpoint details
3. Open Query Tool
4. Load and execute `schema.sql`

#### Using DBeaver (GUI - Recommended):
1. Download from https://dbeaver.io/download/
2. Create new PostgreSQL connection
3. Enter RDS details
4. Right-click database → SQL Editor → Open SQL Script
5. Select `backend/db/schema.sql` and execute

### 4. Verify Tables

Check that all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- forge_admin_actions
- forge_analytics_daily
- forge_equipment
- forge_equipment_events
- forge_lab_rooms
- forge_maintenance
- forge_maintenance_tickets
- forge_scan_log
- forge_transactions
- forge_txn_items
- forge_users

## Connection Pool

The connection pool is configured in `pool.js` with the following settings:

- **max**: 10 connections
- **min**: 2 connections
- **idleTimeoutMillis**: 30 seconds
- **connectionTimeoutMillis**: 2 seconds

### Usage in Application

```javascript
const db = require('./db/pool');

// Initialize pool on app startup
await db.initialize();

// Simple query
const result = await db.query('SELECT * FROM forge_users WHERE user_id = $1', [userId]);

// Get a connection for transactions
const client = await db.getConnection();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO forge_users (username, password_hash) VALUES ($1, $2)', ['user', 'hash']);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release(); // Always release connection back to pool
}

// Close pool on app shutdown
await db.close();
```

## Tables Overview

### Core Tables

- **forge_users** - Student and admin accounts
- **forge_equipment** - Lab equipment inventory
- **forge_transactions** - Borrowing transactions
- **forge_txn_items** - Equipment items per transaction

### Operational Tables

- **forge_maintenance** - Maintenance reports
- **forge_maintenance_tickets** - Maintenance workflow
- **forge_scan_log** - AI scanner audit trail
- **forge_lab_rooms** - Laboratory room definitions

### Admin Tables

- **forge_equipment_events** - Equipment lifecycle events
- **forge_admin_actions** - Admin action audit log
- **forge_analytics_daily** - Daily analytics rollup

## Indexes

The schema includes indexes on commonly queried columns:
- User lookups by Student ID
- Transaction queries by user and date
- Equipment and maintenance lookups
- Admin action auditing

## PostgreSQL vs Oracle Differences

Key changes from Oracle:
- `SERIAL` instead of `NUMBER GENERATED ALWAYS AS IDENTITY`
- `TEXT` instead of `VARCHAR2(4000)` for long text
- `INTEGER` instead of `NUMBER` for integers
- `DECIMAL(5,2)` instead of `NUMBER(5,2)`
- `CURRENT_TIMESTAMP` instead of `SYSTIMESTAMP`
- Lowercase table names (PostgreSQL convention)
- `$1, $2` parameter placeholders instead of `:1, :2`

## Notes

- All tables use PostgreSQL's `SERIAL` for auto-incrementing primary keys
- Foreign key constraints ensure referential integrity
- Check constraints validate enum-like values (status, role, severity, etc.)
- Timestamps use `CURRENT_TIMESTAMP` for automatic creation tracking
- PostgreSQL is fully ACID-compliant like Oracle
