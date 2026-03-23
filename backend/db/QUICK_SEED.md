# Quick Database Setup Guide

## Step 1: Create the Schema

First, run the schema to create all tables:

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d forge -f backend/db/schema.sql
```

## Step 2: Insert Sample Data

Then, run the seed file to populate with test data:

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d forge -f backend/db/seed.sql
```

## What Gets Created

### Users (6 total)
- **juan.cruz** - Juan Dela Cruz (BS Computer Engineering)
- **maria.santos** - Maria Santos (BS Electronics Engineering)  
- **pedro.reyes** - Pedro Reyes (BS Mechanical Engineering)
- **ana.garcia** - Ana Garcia (BS Civil Engineering)
- **jose.lopez** - Jose Lopez (BS Computer Engineering)
- **admin** - Lab Administrator

### Lab Rooms (8 total)
- A-101, A-102 (Computer Engineering)
- B-201, B-202 (Electronics Engineering)
- C-301 (Maintenance), C-302 (Mechanical Engineering)
- D-401, D-402 (Civil Engineering)

### Equipment (17 items)
- 5 Computer Engineering items (oscilloscope, function generator, multimeter, etc.)
- 4 Electronics Engineering items (spectrum analyzer, power supply, etc.)
- 4 Mechanical Engineering items (caliper, micrometer, torque wrench, etc.)
- 4 Civil Engineering items (compression tester, total station, etc.)

### Active Transactions (3 today)
- Juan has 3 items borrowed (oscilloscope, multimeter, logic analyzer)
- Maria has 2 items borrowed (spectrum analyzer, power supply)
- Pedro has 2 items borrowed (caliper, micrometer) - PENDING_RETURN status

## Testing the Dashboard

After seeding, when you sign in as **juan.cruz**, you should see:

1. **Active Transactions section** showing 1 active transaction with 3 items
2. **Laboratory Rooms** showing 8 rooms with their status
3. **High-Demand Equipment** showing borrowed items with progress bars

## Using GUI Tools

### DBeaver (Recommended)
1. Download from https://dbeaver.io/download/
2. Create new PostgreSQL connection
3. Enter your RDS endpoint details
4. Right-click database → SQL Editor → Open SQL Script
5. Run `schema.sql` first, then `seed.sql`

### pgAdmin
1. Create server connection with RDS details
2. Open Query Tool
3. Load and execute `schema.sql`, then `seed.sql`

## Resetting Data

To clear all data and start fresh, the seed.sql file includes TRUNCATE statements at the top. Just run it again to reset.

## Notes

- Password hashes in seed data are placeholders - you'll need to use the signup endpoint to create real users with proper bcrypt hashes
- Equipment S3 image keys are placeholders - actual S3 integration will require uploading real images
- Transaction dates are set to today (2026-03-22) for testing the dashboard
