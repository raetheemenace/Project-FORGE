# DBeaver Setup Guide for Teammates

## Step 1: Download and Install DBeaver

1. Go to https://dbeaver.io/download/
2. Download **DBeaver Community Edition** (free) for your operating system:
   - Windows: Download the installer (.exe)
   - Mac: Download the .dmg file
   - Linux: Download the .deb or .rpm package
3. Run the installer and follow the installation wizard
4. Launch DBeaver after installation

## Step 2: Create PostgreSQL Connection

### 2.1 Start New Connection
1. Open DBeaver
2. Click **"New Database Connection"** button (plug icon) in the toolbar
   - Or go to: **Database** → **New Database Connection**
   - Or press: `Ctrl+Shift+N` (Windows) / `Cmd+Shift+N` (Mac)

### 2.2 Select PostgreSQL
1. In the "Connect to a database" window, select **PostgreSQL**
2. Click **Next**

### 2.3 Enter Connection Details

You need to get these details from your teammate who set up the RDS instance:

**Main Tab:**
- **Host:** `your-rds-endpoint.xxxxx.ap-southeast-1.rds.amazonaws.com`
  - Example: `forge-db.c1a2b3c4d5e6.ap-southeast-1.rds.amazonaws.com`
- **Port:** `5432` (default PostgreSQL port)
- **Database:** `forge`
- **Username:** `postgres` (or the master username used)
- **Password:** `your_rds_password` (ask your teammate)

**Optional Settings:**
- Check **"Save password"** so you don't have to enter it every time
- **Connection name:** You can rename it to "FORGE Database" for clarity

### 2.4 Test Connection
1. Click **"Test Connection"** button at the bottom
2. If this is your first time:
   - DBeaver will ask to download PostgreSQL driver
   - Click **"Download"** and wait for it to complete
3. You should see: **"Connected"** message
4. If you see an error:
   - Check your internet connection
   - Verify the host, port, username, and password
   - Make sure your IP address is allowed in RDS Security Group (ask teammate to add your IP)

### 2.5 Finish Setup
1. Click **"Finish"**
2. Your connection will appear in the **Database Navigator** on the left

## Step 3: Navigate the Database

### 3.1 Expand Your Connection
1. In Database Navigator (left panel), expand your connection
2. Expand **"Databases"** → **"forge"** → **"Schemas"** → **"public"** → **"Tables"**
3. You should see all FORGE tables:
   - forge_users
   - forge_equipment
   - forge_transactions
   - forge_lab_rooms
   - etc.

### 3.2 View Table Data
- Right-click any table → **"View Data"**
- Or double-click the table to open it

## Step 4: Run the Schema and Seed Files

### 4.1 Run Schema (First Time Only)
1. Right-click on **"forge"** database in Database Navigator
2. Select **"SQL Editor"** → **"Open SQL Script"**
3. Navigate to your project folder: `backend/db/schema.sql`
4. Click **"Execute SQL Script"** button (or press `Ctrl+Alt+X`)
5. Wait for "Script execution finished" message

### 4.2 Run Seed Data
1. Open a new SQL Editor:
   - Right-click **"forge"** database → **"SQL Editor"** → **"Open SQL Script"**
2. Navigate to: `backend/db/seed.sql`
3. Click **"Execute SQL Script"** button (or press `Ctrl+Alt+X`)
4. You should see output showing data was inserted

### 4.3 Verify Data
Run this query in SQL Editor:
```sql
SELECT 'Equipment' AS table_name, COUNT(*) AS count FROM forge_equipment
UNION ALL
SELECT 'Lab Rooms', COUNT(*) FROM forge_lab_rooms
UNION ALL
SELECT 'Users', COUNT(*) FROM forge_users
UNION ALL
SELECT 'Transactions', COUNT(*) FROM forge_transactions
ORDER BY table_name;
```

Expected results:
- Equipment: 70
- Lab Rooms: 8
- Users: 6
- Transactions: 3

## Step 5: Common DBeaver Operations

### Execute a Query
1. Open SQL Editor: Right-click database → **"SQL Editor"** → **"New SQL Script"**
2. Type your SQL query
3. Press `Ctrl+Enter` to execute current statement
4. Or press `Ctrl+Alt+X` to execute entire script

### View Query Results
- Results appear in the bottom panel
- Click column headers to sort
- Right-click results to export data

### Export Data
1. Right-click table → **"Export Data"**
2. Choose format (CSV, JSON, SQL, etc.)
3. Follow the export wizard

### Import Data
1. Right-click table → **"Import Data"**
2. Choose source file
3. Map columns and import

## Troubleshooting

### "Connection refused" Error
- Check if RDS instance is running
- Verify the endpoint URL is correct
- Check if your IP is allowed in RDS Security Group

### "Authentication failed" Error
- Verify username and password
- Check if user has access to the database

### "Driver not found" Error
- Click "Download" when prompted to install PostgreSQL driver
- Check your internet connection

### Can't See Tables
- Make sure you're looking in: **Databases** → **forge** → **Schemas** → **public** → **Tables**
- Try refreshing: Right-click connection → **"Refresh"**

## Sharing Connection Details with Team

Create a shared document with these details (use secure method for password):

```
RDS Endpoint: forge-db.xxxxx.ap-southeast-1.rds.amazonaws.com
Port: 5432
Database: forge
Username: postgres
Password: [share securely - don't commit to git]
```

**Security Note:** Never commit database passwords to git! Use a password manager or secure team chat to share credentials.

## Tips for Team Collaboration

1. **Read-Only Access:** If teammates only need to view data, create read-only database users
2. **Backup Before Changes:** Always backup before running DELETE or UPDATE queries
3. **Use Transactions:** Wrap risky queries in BEGIN/COMMIT/ROLLBACK
4. **Communication:** Coordinate who's making schema changes to avoid conflicts

## Quick Reference: Keyboard Shortcuts

- **New Connection:** `Ctrl+Shift+N` / `Cmd+Shift+N`
- **New SQL Editor:** `Ctrl+]` / `Cmd+]`
- **Execute Statement:** `Ctrl+Enter` / `Cmd+Enter`
- **Execute Script:** `Ctrl+Alt+X` / `Cmd+Alt+X`
- **Format SQL:** `Ctrl+Shift+F` / `Cmd+Shift+F`
- **Auto-complete:** `Ctrl+Space` / `Cmd+Space`

## Need Help?

- DBeaver Documentation: https://dbeaver.com/docs/
- DBeaver Community: https://github.com/dbeaver/dbeaver/discussions
- Ask your teammate who set up the RDS instance
