# FORGE: Cloud-Native Multimodal Lab Management Platform

**Transactional Ledger for Multidisciplinary Equipment and Laboratories**

**Institution:** Technological Institute of the Philippines - Manila  
**Courses:** Information Management, HCI 2, Platform Technologies

---

## 👨‍🏫 For Professors: Quick Evaluation Guide

**⚡ 5-Minute Setup:** Pre-configured AWS credentials included for immediate testing.

📖 **See [FOR_PROFESSORS.md](FOR_PROFESSORS.md) for complete evaluation instructions**

**Quick Start:**
1. Extract `env-secrets.zip`
2. Run `npm install` in both `backend/` and `frontend/`
3. Start backend: `cd backend && npm run dev`
4. Start frontend: `cd frontend && npm run dev`
5. Open http://localhost:5173

**Test Credentials:** Sign up with any 7-8 digit Student ID

---

## 📋 Executive Summary

**FORGE** is a cloud-native, multimodal lab management system designed to revolutionize how students and faculty interact with high-value lab equipment and inventories. By integrating a **PostgreSQL 17.6-R2 enterprise ledger** with an **AWS-hosted environment**, FORGE provides a secure, real-time environment for tracking assets. The system features an **HCI-focused Progressive Web App (PWA)** that utilizes **Voice, Vision, and Haptic feedback**, allowing for hands-free operation in demanding laboratory settings.

### Problem Statement

- **Touch-Inefficient Environments:** Laboratory settings often involve gloves or occupied hands, making traditional entry difficult
- **Database Concurrency Conflicts:** Traditional systems often fail when multiple users attempt to claim limited resources simultaneously
- **Lack of Real-Time Visibility:** Manual logs result in "ghost assets" and inefficient management

---

## � Tech Stack

| Category | Technology | Usage |
|----------|-----------|-------|
| **Database** | PostgreSQL 17.6-R2 | ACID-compliant authoritative ledger for all transactions |
| **Backend** | Node.js 24 / Express 5 | Server-side logic to bridge UI, AI, and Database |
| **Frontend** | React 19 / Vite 8 | PWA with camera and voice integration |
| **AI Engine** | AWS Bedrock (Claude 3) | Image identification for equipment |
| **Styling** | Tailwind CSS 4 | Utility-first responsive design |

---

## ☁️ AWS Services

- **Amazon RDS (PostgreSQL 17.6-R2):** Database hosting on `db.t3.micro` Free Tier
- **Amazon S3:** High-resolution equipment image storage for audit trails
- **AWS Bedrock:** Claude 3 Haiku image identification engine
- **AWS Amplify / Elastic Beanstalk:** PWA frontend and Node.js backend hosting
- **AWS Polly & Transcribe:** Voice guidance and speech-to-text

---

## 🌐 Live Deployment

**Frontend:** https://main.d7sychv2krlg6.amplifyapp.com  
**Backend:** http://forge-production.eba-44spvn32.ap-southeast-1.elasticbeanstalk.com  
**Database:** PostgreSQL 17.6-R2 on AWS RDS (ap-southeast-1)

The application is fully deployed and accessible online. Test credentials: Sign up with any 7-8 digit Student ID.

---

## 📦 Quick Start (Local Development)

### 🚀 For Professors and Teammates

**See complete guides:** [FOR_PROFESSORS.md](FOR_PROFESSORS.md) | [TEAM_GUIDE.md](TEAM_GUIDE.md)

**Quick Setup (5 minutes):**

1. **Extract credentials:**
   ```bash
   unzip env-secrets.zip
   ```

2. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install --legacy-peer-deps
   ```

3. **Start servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

4. **Test:** Open http://localhost:5173

### 📚 Documentation

- **[FOR_PROFESSORS.md](FOR_PROFESSORS.md)** - Evaluation guide (5-minute setup)
- **[TEAM_GUIDE.md](TEAM_GUIDE.md)** - Complete guide for teammates
- **[backend/SETUP.md](backend/SETUP.md)** - Backend infrastructure details
- **[backend/db/README.md](backend/db/README.md)** - Database setup guide
- **[docs/AWS_DEPLOYMENT_GUIDE.md](docs/AWS_DEPLOYMENT_GUIDE.md)** - AWS deployment

### 🧪 Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

---

## 📦 Dependencies

### Backend (`/backend`)

- **express** v5.1.0 - REST API server
- **pg** v8.20.0 - PostgreSQL database connectivity
- **jsonwebtoken** v9.0.3 - JWT authentication
- **bcryptjs** v3.0.3 - Password hashing
- **@aws-sdk/client-bedrock-runtime** v3.1010.0 - AI model invocation
- **@aws-sdk/client-s3** v3.1010.0 - S3 storage operations
- **@aws-sdk/s3-request-presigner** v3.1010.0 - S3 presigned URLs
- **@aws-sdk/client-polly** v3.1014.0 - Text-to-speech
- **@aws-sdk/client-transcribe-streaming** v3.1014.0 - Speech-to-text
- **cors** v2.8.6 - Cross-origin resource sharing
- **dotenv** v17.3.1 - Environment configuration
- **nodemon** v3.1.14 (dev) - Development auto-restart
- **vitest** v4.1.0 (dev) - Testing framework
- **fast-check** v3.24.2 (dev) - Property-based testing

### Frontend (`/frontend`)

- **react** & **react-dom** v19.2.4 - UI framework
- **react-router-dom** v7.13.1 - Client-side routing
- **vite** v8.0.0 - Build tool and dev server
- **@vitejs/plugin-react** v6.0.1 - React support for Vite
- **axios** v1.13.6 - HTTP client
- **tailwindcss** v4.2.1 - Utility-first CSS
- **lucide-react** v0.577.0 - Icon library
- **framer-motion** v12.38.0 - Animation library
- **vite-plugin-pwa** v0.21.2 - Progressive Web App support
- **vitest** v4.1.0 (dev) - Testing framework
- **fast-check** v3.24.2 (dev) - Property-based testing

---

## 👥 The FORGE Team

| Name | Role | Primary Responsibility |
|------|------|------------------------|
| **John Raven S. Unera** | Fullstack & Integration | AWS Infrastructure (RDS, Bedrock, S3), Frontend/Backend bridging, GitHub management |
| **Kate Russel E. Adonis** | Backend Developer | Node.js/Express.js server-side logic and PostgreSQL database architecture |
| **Zoe Felicia L. Valdez** | Frontend Developer | React.js PWA development, Multimodal HCI (Voice, Vision, Haptics) |

---

## 📝 Database Migration Notice

**Important Update:** We have migrated from Oracle 19c to PostgreSQL 17.6-R2 on AWS RDS.

**Why PostgreSQL?**
- ✅ Free Forever (no licensing costs)
- ✅ AWS Free Tier eligible (db.t3.micro for 12 months)
- ✅ Better Node.js ecosystem support
- ✅ Same ACID compliance and transaction guarantees
- ✅ Easier setup and deployment
- ✅ Industry standard for modern web applications

**For Teammates:** Pull the latest changes and update your `.env` file with PostgreSQL credentials.

**For Professors:** All database functionality remains identical - we still have full ACID compliance, transaction management, and enterprise-grade reliability.

---

**© 2026 FORGE Team - Technological Institute of the Philippines - Manila**
