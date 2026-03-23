# Teammate Sync Guide - PostgreSQL Migration

**Date:** March 22, 2026  
**Branch:** testbranch  
**Important:** Database migrated from Oracle to PostgreSQL

---

## 🚨 Action Required

We've migrated from Oracle 19c to PostgreSQL 17.6-R2. Follow these steps to sync up:

---

## Step 1: Pull Latest Changes

```bash
# Make sure you're on testbranch
git checkout testbranch

# Pull the latest changes
git pull origin testbranch
```

---

## Step 2: Update Your .env File

The database configuration has changed. Update your `backend/.env` file:

### Old (Oracle):
```env
DB_USER=oracle_user
DB_PASSWORD=oracle_password
DB_CONNECTION_STRING=oracle_connection_string
```

### New (PostgreSQL):
```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_CONNECTION_STRING=localhost  # or RDS endpoint
DB_PORT=5432
DB_NAME=forge
```

**Get the actual credentials from the team lead** (John Raven) via secure channel.

---

## Step 3: Install/Update Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (no changes, but good to update)
cd ../frontend
npm install
```

---

## Step 4: Set Up Local PostgreSQL Database

### Option A: Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL 17.6+**
   - Windows: https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql@17`
   - Linux: `sudo apt install postgresql-17`

2. **Create Database**
   ```bash
   # Start PostgreSQL service
   # Windows: Check services.msc
   # Mac: brew services start postgresql@17
   # Linux: sudo systemctl start postgresql
   
   # Create database
   psql -U postgres
   CREATE DATABASE forge;
   \q
   ```

3. **Run Schema**
   ```bash
   psql -U postgres -d forge -f backend/db/schema.sql
   ```

4. **Verify**
   ```bash
   psql -U postgres -d forge
   \dt  # Should show 11 forge_* tables
   \q
   ```

### Option B: Use Shared AWS RDS (Ask Team Lead)

If using the shared RDS instance:
1. Get credentials from John Raven
2. Update `backend/.env` with RDS endpoint
3. No need to run schema (already created)

---

## Step 5: Test Your Setup

```bash
# Test backend
cd backend
npm test

# Should see: ✅ All tests passing
```

---

## Step 6: Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 - should work!

---

## What Changed?

### Files Modified:
- ✅ `backend/db/schema.sql` - PostgreSQL syntax
- ✅ `backend/db/pool.js` - Using `pg` driver instead of `oracledb`
- ✅ `backend/.env` - PostgreSQL connection string
- ✅ `.env.example` - Updated template
- ✅ `package.json` - Updated dependencies
- ✅ `.kiro/specs/forge-system/tasks.md` - Updated task descriptions
- ✅ Documentation files - Updated references

### What Stayed the Same:
- ✅ All API endpoints
- ✅ All frontend code
- ✅ All functionality
- ✅ All tests (just updated connection)

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

**Problem:** Can't connect to PostgreSQL

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for "postgresql" service
   
   # Mac
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify credentials in `backend/.env`

3. Check database exists:
   ```bash
   psql -U postgres -l
   ```

### "Module not found: pg"

**Problem:** Missing PostgreSQL driver

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### "Database does not exist"

**Problem:** Database not created

**Solution:**
```bash
psql -U postgres
CREATE DATABASE forge;
\q
```

### "Permission denied"

**Problem:** PostgreSQL user permissions

**Solution:**
```bash
# Reset postgres password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

### Tests Failing

**Problem:** Tests not passing

**Solutions:**
1. Make sure database is running
2. Verify `.env` has correct credentials
3. Run schema: `psql -U postgres -d forge -f backend/db/schema.sql`
4. Clear and reinstall: `rm -rf node_modules && npm install`

---

## Quick Reference

### PostgreSQL Commands

```bash
# Connect to database
psql -U postgres -d forge

# List databases
\l

# List tables
\dt

# Describe table
\d table_name

# Run SQL file
\i path/to/file.sql

# Quit
\q
```

### Useful Queries

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Count users
SELECT COUNT(*) FROM forge_users;

-- View recent transactions
SELECT * FROM forge_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Why PostgreSQL?

Quick benefits:
- ✅ **Free forever** - No licensing costs
- ✅ **AWS Free Tier** - db.t3.micro free for 12 months
- ✅ **Better Node.js support** - Mature `pg` driver
- ✅ **Same ACID compliance** - All database features maintained
- ✅ **Easier setup** - Available everywhere
- ✅ **Industry standard** - Used by most modern web apps

All functionality is identical - just a different database engine.

---

## Need Help?

### Contact Team Lead
- **John Raven S. Unera** - For AWS RDS credentials and setup help

### Check Documentation
- `README.md` - Project overview
- `QUICK_START_GUIDE.md` - Detailed setup for testing
- `MIGRATION_SUMMARY.md` - Complete migration details
- `docs/POSTGRESQL_SETUP.md` - PostgreSQL RDS setup
- `backend/db/README.md` - Database schema details

### Common Issues
- Can't connect? Check PostgreSQL is running
- Tests failing? Verify database schema is loaded
- Missing dependencies? Run `npm install` again
- Wrong credentials? Ask team lead for correct `.env` values

---

## Checklist

Use this to verify you're synced:

- [ ] Pulled latest changes from testbranch
- [ ] PostgreSQL installed and running
- [ ] Database `forge` created
- [ ] Schema executed (11 tables created)
- [ ] `backend/.env` updated with PostgreSQL credentials
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend tests pass (`npm test` in backend/)
- [ ] Backend server starts (`npm run dev` in backend/)
- [ ] Frontend server starts (`npm run dev` in frontend/)
- [ ] Can access http://localhost:5173
- [ ] Can sign up and sign in

---

## Next Steps

Once you're synced:
1. ✅ Test the application locally
2. ✅ Review the updated tasks in `.kiro/specs/forge-system/tasks.md`
3. ✅ Coordinate with team on next features to implement
4. ✅ Keep your branch updated: `git pull origin testbranch` regularly

---

**Last Updated:** March 22, 2026  
**Status:** PostgreSQL migration complete, all tests passing  
**Team:** John Raven S. Unera, Kate Russel E. Adonis, Zoe Felicia L. Valdez
