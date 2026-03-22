# FORGE Quick Start Guide for Testing

**For Professors and Teammates**

This guide will help you quickly set up and test the FORGE project on your local machine.

---

## 📋 Prerequisites (Install These First)

### Required Software

| Software | Version | Download Link | Verify Installation |
|----------|---------|---------------|---------------------|
| **Node.js** | v24.14.0 LTS | https://nodejs.org/ | `node -v` |
| **npm** | v11.9.0+ | (comes with Node.js) | `npm -v` |
| **Git** | v2.48+ | https://git-scm.com/ | `git --version` |
| **PostgreSQL** | 17.6+ | https://www.postgresql.org/download/ | `psql --version` |

### Optional (Recommended for Database Management)

- **DBeaver** (Database GUI): https://dbeaver.io/download/
- **pgAdmin** (PostgreSQL GUI): https://www.pgadmin.org/download/

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Clone the Repository

```bash
# Clone the project
git clone https://github.com/raetheemenace/Project-FORGE.git
cd Project-FORGE

# Switch to the development branch
git checkout testbranch
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to project root
cd ..
```

**Expected output:** No errors, all packages installed successfully.

---

### Step 3: Set Up Local PostgreSQL Database

#### Option A: Using Command Line (psql)

```bash
# Create the database
psql -U postgres
CREATE DATABASE forge;
\q

# Run the schema
psql -U postgres -d forge -f backend/db/schema.sql
```

#### Option B: Using DBeaver (Recommended for Beginners)

1. Open DBeaver
2. Click "New Database Connection"
3. Select "PostgreSQL"
4. Enter connection details:
   - Host: `localhost`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: (your PostgreSQL password)
5. Click "Test Connection" → Should succeed
6. Click "Finish"
7. Right-click connection → SQL Editor → New SQL Script
8. Copy contents of `backend/db/schema.sql` and paste
9. Click "Execute SQL Statement" (▶️ button)
10. Verify: 11 tables created in the `public` schema

---

### Step 4: Configure Environment Variables

Create a `.env` file in the `backend` folder:

```bash
cd backend
```

**For Windows (PowerShell):**
```powershell
Copy-Item ..\.env.example .env
```

**For Mac/Linux:**
```bash
cp ../.env.example .env
```

Edit `backend/.env` with these **minimum required** values:

```env
# Database Configuration (Local PostgreSQL)
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_CONNECTION_STRING=localhost
DB_PORT=5432
DB_NAME=forge

# JWT Configuration (Use this for testing)
JWT_SECRET=test-secret-key-for-development-only-change-in-production
JWT_EXPIRY=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# AWS Configuration (Optional for basic testing - can be dummy values)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=dummy-key-for-local-testing
AWS_SECRET_ACCESS_KEY=dummy-secret-for-local-testing
S3_BUCKET_NAME=forge-equipment-images
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

**Note:** AWS features (AI scanner, image storage) won't work with dummy credentials, but authentication and basic features will work fine for testing.

---

### Step 5: Run the Application

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
[nodemon] starting `node index.js`
Server running on port 5000
Database pool initialized
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v8.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## ✅ Testing the Application

### 1. Open Your Browser

Navigate to: **http://localhost:5173**

You should see the FORGE landing page.

### 2. Test Sign Up

1. Click "Get Started" or "Sign Up"
2. Fill in the form:
   - **Full Name:** Test User
   - **Student ID:** 2024-12345 (format: YYYY-NNNNN)
   - **Email:** test@tip.edu.ph
   - **Password:** Test123!
   - **Confirm Password:** Test123!
3. Click "Sign Up"
4. Should redirect to Sign In page

### 3. Test Sign In

1. Enter credentials:
   - **Email:** test@tip.edu.ph
   - **Password:** Test123!
2. Click "Sign In"
3. Should see success message (dashboard coming in next tasks)

### 4. Verify Database

Check that the user was created:

```sql
-- In DBeaver or psql
SELECT user_id, full_name, email, student_id, role 
FROM forge_users;
```

You should see your test user in the database.

---

## 🧪 Running Tests

### Backend Tests

```bash
cd backend
npm test
```

Expected: All tests pass ✅

### Frontend Tests

```bash
cd frontend
npm test
```

Expected: All tests pass ✅

---

## 📊 What's Currently Implemented (Steps 1-3)

✅ **Task 1: Project Infrastructure**
- PostgreSQL database schema (11 tables)
- Connection pool
- Environment configuration
- Testing framework (Vitest + fast-check)

✅ **Task 2: Authentication System**
- JWT middleware
- Sign in endpoint (`POST /api/auth/signin`)
- Sign up endpoint (`POST /api/auth/signup`)
- Password hashing with bcrypt
- Property-based tests for validation

✅ **Task 3: Frontend Authentication Pages**
- Landing page with feature overview
- Sign In page with form validation
- Sign Up page with Student ID validation
- Auth service and hooks
- Responsive design with Tailwind CSS

---

## 🔧 Troubleshooting

### Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

Or change the port in `backend/.env`:
```env
PORT=5001
```

### Database Connection Error

**Error:** `Connection refused` or `ECONNREFUSED`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for "postgresql" service
   
   # Mac
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check credentials in `backend/.env`
3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```

### Module Not Found

**Error:** `Cannot find module 'express'` or similar

**Solution:**
```bash
# Delete node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Student ID Validation Error

**Error:** "Invalid Student ID format"

**Solution:** Use format `YYYY-NNNNN` (e.g., `2024-12345`)
- Year: 4 digits
- Dash: `-`
- Number: 5 digits

### CORS Error in Browser

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:** Make sure backend is running on port 5000 and frontend on 5173. The frontend is configured to proxy API requests to the backend.

---

## 📁 Project Structure

```
Project-FORGE/
├── backend/                 # Node.js/Express backend
│   ├── db/
│   │   ├── schema.sql      # Database schema
│   │   └── pool.js         # Connection pool
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   └── auth.js         # Auth endpoints
│   ├── .env                # Environment variables (create this)
│   ├── index.js            # Server entry point
│   └── package.json        # Backend dependencies
│
├── frontend/               # React/Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # Custom hooks (useAuth)
│   │   ├── pages/          # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── SignIn.jsx
│   │   │   └── SignUp.jsx
│   │   ├── services/       # API services
│   │   └── main.jsx        # React entry point
│   └── package.json        # Frontend dependencies
│
└── docs/                   # Documentation
```

---

## 🎯 Testing Checklist

Use this to verify everything works:

- [ ] Node.js and npm installed and verified
- [ ] PostgreSQL installed and running
- [ ] Repository cloned and on `testbranch`
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Frontend dependencies installed (`npm install` in frontend/)
- [ ] Database created (`forge`)
- [ ] Schema executed (11 tables created)
- [ ] `.env` file created in backend/
- [ ] Backend server starts without errors
- [ ] Frontend dev server starts without errors
- [ ] Landing page loads in browser
- [ ] Can create new user account (Sign Up)
- [ ] Can sign in with created account
- [ ] User appears in database
- [ ] Backend tests pass (`npm test` in backend/)
- [ ] Frontend tests pass (`npm test` in frontend/)

---

## 📞 Support

### Common Questions

**Q: Do I need AWS to test the basic features?**
A: No! Authentication and database features work with just local PostgreSQL. AWS is only needed for AI scanner and image storage (coming in later tasks).

**Q: What if I don't have PostgreSQL installed?**
A: Download from https://www.postgresql.org/download/ and follow the installer. Remember your password!

**Q: Can I use a different database?**
A: The project is configured for PostgreSQL. Using a different database would require code changes.

**Q: The frontend shows a blank page**
A: Check browser console (F12) for errors. Make sure backend is running on port 5000.

**Q: Tests are failing**
A: Make sure all dependencies are installed. Try deleting `node_modules` and running `npm install` again.

---

## 📚 Additional Documentation

- **Detailed Setup:** `SETUP_INSTRUCTIONS.md`
- **Setup Checklist:** `SETUP_CHECKLIST.md`
- **Backend Setup:** `backend/SETUP.md`
- **Database Guide:** `backend/db/README.md`
- **PostgreSQL Setup:** `docs/POSTGRESQL_SETUP.md`
- **Migration Info:** `MIGRATION_SUMMARY.md`
- **Testing Guide:** `TESTING.md`

---

## 🎓 For Professors

### Grading Criteria Demonstrated

**Information Management:**
- ✅ ACID-compliant PostgreSQL database
- ✅ Normalized schema (11 tables, proper relationships)
- ✅ Transaction management
- ✅ Data integrity constraints

**HCI 2:**
- ✅ Responsive design (mobile-first)
- ✅ Form validation with user feedback
- ✅ Accessible UI components
- ✅ Progressive Web App foundation

**Platform Technologies:**
- ✅ Cloud-native architecture (AWS-ready)
- ✅ RESTful API design
- ✅ JWT authentication
- ✅ Modern tech stack (React, Node.js, PostgreSQL)
- ✅ Property-based testing
- ✅ CI/CD ready (Git workflow)

### What to Evaluate

1. **Code Quality:** Clean, well-documented, follows best practices
2. **Database Design:** Proper normalization, indexes, constraints
3. **Security:** Password hashing, JWT tokens, input validation
4. **Testing:** Property-based tests, unit tests, integration tests
5. **User Experience:** Intuitive UI, clear error messages, responsive design
6. **Documentation:** Comprehensive setup guides, code comments

---

**Last Updated:** March 22, 2026
**Version:** 1.0 (Tasks 1-3 Complete)
**Team:** John Raven S. Unera, Kate Russel E. Adonis, Zoe Felicia L. Valdez
