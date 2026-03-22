# FORGE Setup Checklist

Use this checklist to set up your FORGE development environment.

## ✅ Completed (Already Done)

- [x] Project infrastructure created
- [x] PostgreSQL schema created (`backend/db/schema.sql`)
- [x] Connection pool configured (`backend/db/pool.js`)
- [x] Environment variables template created (`.env.example`)
- [x] Testing framework installed (vitest + fast-check)
- [x] JWT and bcrypt dependencies installed
- [x] Documentation created
- [x] All tests passing

## 📋 Your To-Do List

### 1. AWS Account Setup

- [ ] Create AWS account (if you don't have one)
- [ ] Verify email and add payment method
- [ ] Note: Free Tier is free for 12 months

### 2. IAM User and Access Keys

- [ ] Go to AWS Console → IAM
- [ ] Create user: `forge-app-user`
- [ ] Attach policies:
  - [ ] AmazonRDSFullAccess
  - [ ] AmazonS3FullAccess
  - [ ] AmazonBedrockFullAccess
  - [ ] AmazonPollyFullAccess
  - [ ] AmazonTranscribeFullAccess
- [ ] Create access key
- [ ] Save Access Key ID and Secret Access Key

### 3. Create S3 Bucket

- [ ] Go to AWS Console → S3
- [ ] Create bucket: `forge-equipment-images-yourname`
- [ ] Region: **ap-southeast-1** (Singapore)
- [ ] Keep "Block all public access" checked
- [ ] Note bucket name for .env

### 4. Enable AWS Bedrock

- [ ] Go to AWS Console → Bedrock
- [ ] Switch to **ap-southeast-1** region
- [ ] Click "Model access"
- [ ] Request access to:
  - [ ] Claude 3 Haiku
  - [ ] Claude 3 Sonnet (optional)
- [ ] Wait for approval (usually instant)

### 5. Create PostgreSQL RDS Database

**Follow the detailed guide in `docs/POSTGRESQL_SETUP.md`**

Quick steps:
- [ ] Go to AWS Console → RDS
- [ ] Create database
- [ ] Engine: PostgreSQL 17.6-R2
- [ ] Template: Free tier
- [ ] Instance: db.t3.micro
- [ ] DB identifier: `forge-db`
- [ ] Master username: `postgres`
- [ ] Master password: (create strong password)
- [ ] Public access: **Yes**
- [ ] Initial database name: `forge`
- [ ] Region: **ap-southeast-1**
- [ ] Wait 5-10 minutes for creation

### 6. Configure Security Group

- [ ] Find your IP: https://whatismyipaddress.com/
- [ ] In RDS, click your database
- [ ] Click VPC security group
- [ ] Edit inbound rules
- [ ] Add rule: PostgreSQL, Port 5432, Source: My IP
- [ ] Save rules

### 7. Update Environment Variables

Edit `backend/.env`:

```env
# Database (update these)
DB_USER=postgres
DB_PASSWORD=your_actual_password
DB_CONNECTION_STRING=your-actual-endpoint.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=forge

# AWS (update these)
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=ap-southeast-1

# S3 (update this)
S3_BUCKET_NAME=your-actual-bucket-name

# JWT (generate new secret)
JWT_SECRET=generate_a_random_64_character_string
```

Generate JWT secret (PowerShell):
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

### 8. Install Database Client

Choose one:
- [ ] **DBeaver** (recommended): https://dbeaver.io/download/
- [ ] **pgAdmin**: https://www.pgadmin.org/download/
- [ ] **psql** (command line): https://www.postgresql.org/download/

### 9. Run Database Schema

Using your database client:
- [ ] Connect to your RDS instance
- [ ] Open `backend/db/schema.sql`
- [ ] Execute the script
- [ ] Verify 11 tables created

Verify with this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected: 11 tables starting with `forge_`

### 10. Test Backend

- [ ] Open terminal in project root
- [ ] Run: `cd backend`
- [ ] Run: `npm test`
- [ ] Verify: All tests pass ✅

### 11. Start Development

- [ ] Backend: `cd backend && npm run dev`
- [ ] Frontend: `cd frontend && npm run dev`
- [ ] Open browser: http://localhost:5173

---

## 🎯 Success Criteria

You're ready to proceed when:

✅ AWS account created and verified
✅ IAM user with access keys created
✅ S3 bucket created in ap-southeast-1
✅ Bedrock access granted for Claude 3
✅ PostgreSQL RDS instance running
✅ Security group allows your IP
✅ Database schema executed successfully
✅ `.env` file updated with real credentials
✅ `npm test` passes in backend
✅ Backend server starts without errors

---

## 📚 Reference Documents

- **PostgreSQL Setup**: `docs/POSTGRESQL_SETUP.md`
- **Migration Info**: `MIGRATION_SUMMARY.md`
- **Backend Setup**: `backend/SETUP.md`
- **Database Guide**: `backend/db/README.md`

---

## 🆘 Need Help?

**Can't select Oracle in RDS?**
→ That's why we use PostgreSQL! It's better and free.

**Connection refused?**
→ Check security group allows your IP on port 5432

**Authentication failed?**
→ Verify username is `postgres` and password is correct

**Tests failing?**
→ Make sure all dependencies installed: `npm install`

---

## 🚀 Next Task

Once this checklist is complete:
→ **Task 2: Implement Authentication System**

This includes:
- JWT middleware
- Sign in/sign up endpoints
- Property-based tests
- Frontend auth service

---

**Current Status**: Infrastructure ready, waiting for AWS resources setup
