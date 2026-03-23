# For Professors - FORGE System Evaluation Guide

This guide helps professors quickly set up and evaluate the FORGE lab management system.

## Quick Start (5 Minutes)

### Option 1: Use Provided Credentials (Fastest)

We've included pre-configured AWS credentials and database access for immediate testing.

1. **Extract Secrets**
   ```bash
   # Unzip the provided credentials
   unzip env-secrets.zip
   
   # This creates an env-secrets folder with:
   # - backend/.env (AWS keys, database credentials)
   # - Database connection details
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend (in new terminal)
   cd frontend
   npm install --legacy-peer-deps
   ```

3. **Start the Application**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   # Runs on http://localhost:5000
   
   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

4. **Test the System**
   - Open http://localhost:5173
   - Sign up with any 7-8 digit student ID
   - Test the AI equipment scanner
   - Browse the dashboard and features

### Option 2: Use Your Own AWS Account

If you prefer to use your own AWS credentials:

1. Follow `docs/AWS_DEPLOYMENT_GUIDE.md`
2. Set up your own RDS, S3, and Bedrock
3. Update `backend/.env` with your credentials

## What's Included

### Pre-Configured AWS Services
- ✅ **PostgreSQL RDS Database** - 70 lab equipment items seeded
- ✅ **AWS S3 Bucket** - Image storage configured
- ✅ **AWS Bedrock (Claude 3 Haiku)** - AI equipment identification
- ✅ **AWS Polly & Transcribe** - Voice features (optional)

### Test Credentials
The system uses passwordless authentication:
- **Sign Up:** Full Name + Student ID (7-8 digits) + Program
- **Sign In:** Full Name + Student ID

**Sample Test User (already in database):**
- Full Name: `Juan Dela Cruz`
- Student ID: `2024001`

## Key Features to Evaluate

### 1. Authentication System
- Passwordless sign up/sign in
- JWT token-based authentication
- Role-based access (Student/Admin)

### 2. AI Equipment Scanner
- Camera-based equipment identification
- AWS Bedrock Claude 3 integration
- Real-time equipment matching to database

### 3. Transaction Management
- Equipment borrowing workflow
- ACID-compliant transaction ledger
- Real-time availability tracking

### 4. Admin Dashboard
- User management
- Equipment inventory
- Analytics and reporting
- Maintenance ticket system

### 5. Multimodal Accessibility
- Text-to-Speech (AWS Polly)
- Speech-to-Text (AWS Transcribe)
- Hands-free operation for lab environments

## Database Access

If you want to inspect the database directly:

**Connection Details (in env-secrets folder):**
- Host: `forge-db.c1aooiquon01.ap-southeast-1.rds.amazonaws.com`
- Port: `5432`
- Database: `forge`
- Username: `postgres`
- Password: (see env-secrets/backend/.env)

**Recommended Tool:** DBeaver, pgAdmin, or any PostgreSQL client

## Architecture Overview

```
Frontend (React + Vite)
    ↓ HTTP/REST
Backend (Node.js + Express)
    ↓
├─→ PostgreSQL RDS (Database)
├─→ AWS S3 (Image Storage)
├─→ AWS Bedrock (AI Identification)
└─→ AWS Polly/Transcribe (Voice Features)
```

## Technology Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4
- **Backend:** Node.js 24, Express 5
- **Database:** PostgreSQL 17.6-R2 (AWS RDS)
- **AI/ML:** AWS Bedrock (Claude 3 Haiku)
- **Storage:** AWS S3
- **Voice:** AWS Polly (TTS), AWS Transcribe (STT)

## Evaluation Checklist

- [ ] System starts successfully
- [ ] User can sign up and sign in
- [ ] AI scanner identifies lab equipment
- [ ] Equipment borrowing workflow works
- [ ] Admin dashboard displays data
- [ ] Database transactions are ACID-compliant
- [ ] PWA features work on mobile
- [ ] Voice features function (optional)

## Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm run dev
```

### Frontend won't start
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### Database connection fails
- Check if credentials in `backend/.env` are correct
- Ensure your IP is whitelisted in AWS RDS security group
- Contact student for updated credentials if needed

### AI Scanner not working
- Wait 1-2 minutes if you see "rate limit" errors
- AWS Bedrock has request limits (4 requests/minute for free tier)
- This is normal AWS behavior, not a bug

## Production Deployment

The system is deployed at:
- **Frontend:** AWS Amplify (PWA)
- **Backend:** AWS Elastic Beanstalk
- **Database:** AWS RDS PostgreSQL

Deployment guides available in `docs/` folder.

## Academic Context

**Course:** Information Management, HCI 2, Platform Technologies  
**Institution:** Technological Institute of the Philippines - Manila  
**Purpose:** Demonstrate enterprise-grade cloud architecture and modern web development

## Contact

For questions or issues during evaluation, please contact the student team.

---

**Note:** The provided AWS credentials are for evaluation purposes only and will be deactivated after grading period.
