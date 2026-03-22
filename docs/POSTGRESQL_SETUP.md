# PostgreSQL RDS Setup Guide for FORGE

## Quick Setup Steps for Singapore Region

### Step 1: Create PostgreSQL RDS Database

1. **Go to AWS Console**
   - Navigate to https://console.aws.amazon.com/
   - Sign in with your account

2. **Open RDS Service**
   - Search for "RDS" in the top search bar
   - Click on "RDS"

3. **Create Database**
   - Click "Create database" (orange button)

4. **Choose Database Creation Method**
   - Select "Standard create"

5. **Engine Options**
   - Engine type: **PostgreSQL**
   - Version: **PostgreSQL 17.6-R2** (latest)

6. **Templates**
   - Select **Free tier** ✓

7. **Settings**
   - DB instance identifier: `forge-db`
   - Master username: `postgres`
   - Master password: Create a strong password (e.g., `ForgeDB2026!Secure`)
   - Confirm password: Re-enter the same password
   
   **⚠️ SAVE THESE CREDENTIALS!**

8. **Instance Configuration**
   - DB instance class: `db.t3.micro` (automatically selected for Free Tier)

9. **Storage**
   - Storage type: General Purpose SSD (gp3)
   - Allocated storage: 20 GiB
   - Uncheck "Enable storage autoscaling" (to control costs)

10. **Connectivity**
    - Compute resource: Don't connect to an EC2 compute resource
    - VPC: Default VPC
    - Public access: **Yes** ✓ (important!)
    - VPC security group: Create new
      - Name: `forge-db-sg`
    - Availability Zone: No preference
    - Database port: 5432 (default)

11. **Database Authentication**
    - Select "Password authentication"

12. **Additional Configuration** (click to expand)
    - Initial database name: `forge` ✓ (important!)
    - Backup:
      - Uncheck "Enable automated backups" (for development)
    - Encryption: Keep enabled (default)
    - Monitoring:
      - Uncheck "Enable Enhanced monitoring" (to save costs)
    - Maintenance: Keep defaults

13. **Create Database**
    - Review estimated monthly costs (should be $0.00 for Free Tier)
    - Click "Create database"
    - **Wait 5-10 minutes** for status to change to "Available"

### Step 2: Configure Security Group

1. **Find Your IP Address**
   - Go to https://whatismyipaddress.com/
   - Copy your IPv4 address (e.g., `123.45.67.89`)

2. **Update Security Group**
   - In RDS console, click your database `forge-db`
   - Under "Connectivity & security", click the VPC security group link
   - Click "Inbound rules" tab
   - Click "Edit inbound rules"
   - Click "Add rule"
   - Configure:
     - Type: **PostgreSQL**
     - Protocol: TCP
     - Port: 5432
     - Source: **My IP** (auto-fills your IP)
     - Description: "My development machine"
   - Click "Save rules"

### Step 3: Get Connection Details

1. **In RDS Console**
   - Click on your database `forge-db`
   - Go to "Connectivity & security" tab

2. **Copy These Values**
   - **Endpoint**: `forge-db.c1a2b3c4d5e6.ap-southeast-1.rds.amazonaws.com`
   - **Port**: `5432`
   - **Database name**: `forge`

### Step 4: Update Your .env File

Edit `backend/.env`:

```env
DB_USER=postgres
DB_PASSWORD=ForgeDB2026!Secure
DB_CONNECTION_STRING=forge-db.c1aooiquon01.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=forge
```

### Step 5: Install Database Client

Choose one:

#### Option A: DBeaver (Recommended - Easy GUI)

1. Download from https://dbeaver.io/download/
2. Install and launch
3. Click "New Database Connection"
4. Select "PostgreSQL"
5. Enter connection details:
   - Host: Your RDS endpoint
   - Port: 5432
   - Database: forge
   - Username: postgres
   - Password: Your password
6. Click "Test Connection" - should succeed
7. Click "Finish"

#### Option B: pgAdmin (Alternative GUI)

1. Download from https://www.pgadmin.org/download/
2. Install and launch
3. Right-click "Servers" → "Register" → "Server"
4. General tab:
   - Name: FORGE Database
5. Connection tab:
   - Host: Your RDS endpoint
   - Port: 5432
   - Database: forge
   - Username: postgres
   - Password: Your password
6. Click "Save"

#### Option C: psql (Command Line)

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install (you only need the command-line tools)
3. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

**Test connection:**
```bash
psql -h forge-db.xxxxx.ap-southeast-1.rds.amazonaws.com -U postgres -d forge
```

### Step 6: Run Database Schema

#### Using DBeaver:
1. Connect to your database
2. Right-click database → "SQL Editor" → "Open SQL Script"
3. Navigate to `backend/db/schema.sql`
4. Click "Execute SQL Script" (or press Ctrl+Alt+X)
5. Verify: All tables created successfully

#### Using pgAdmin:
1. Connect to your database
2. Right-click "forge" database → "Query Tool"
3. Click "Open File" icon
4. Select `backend/db/schema.sql`
5. Click "Execute" (F5)
6. Verify: Check "Tables" in left sidebar

#### Using psql:
```bash
psql -h forge-db.xxxxx.ap-southeast-1.rds.amazonaws.com -U postgres -d forge -f backend/db/schema.sql
```

### Step 7: Verify Setup

Run this query in your database client:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Result:** 11 tables
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

### Step 8: Test Backend Connection

```bash
cd backend
npm test
```

Should show: ✅ All tests passing

---

## Troubleshooting

### "Connection refused" or "timeout"
- ✅ Check security group allows your IP on port 5432
- ✅ Verify "Public access" is enabled on RDS instance
- ✅ Check your IP hasn't changed (use whatismyipaddress.com)
- ✅ Verify database status is "Available"

### "Database does not exist"
- ✅ Make sure you set "Initial database name" to `forge` when creating RDS
- ✅ Or create it manually: `CREATE DATABASE forge;`

### "Authentication failed"
- ✅ Double-check username is `postgres`
- ✅ Verify password is correct
- ✅ Check for extra spaces in .env file

### "Too many connections"
- ✅ Close unused database client connections
- ✅ Restart your RDS instance if needed

---

## Cost Management

**Free Tier Limits (12 months):**
- 750 hours/month of db.t3.micro usage
- 20 GB of storage
- 20 GB of backup storage

**Tips to Stay Free:**
- Use only one db.t3.micro instance
- Stop instance when not developing (saves hours)
- Delete old backups
- Monitor usage in AWS Billing Dashboard

**After Free Tier:**
- db.t3.micro: ~$15/month
- Storage: ~$2.30/month for 20 GB
- Total: ~$17-20/month

---

## Next Steps

Once your database is set up:

1. ✅ Verify connection from backend
2. ✅ Run tests: `npm test`
3. 🚀 Ready for **Task 2: Authentication System**

---

## Quick Reference

**Connection String Format:**
```
postgresql://postgres:password@endpoint:5432/forge
```

**psql Connection:**
```bash
psql -h endpoint -U postgres -d forge
```

**Common psql Commands:**
```sql
\dt              -- List tables
\d table_name    -- Describe table
\q               -- Quit
```

**Check Connection from Node.js:**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'your-endpoint',
  port: 5432,
  database: 'forge',
  user: 'postgres',
  password: 'your-password'
});

pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
```
