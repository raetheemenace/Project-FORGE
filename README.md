# FORGE: A Cloud-Native Multimodal Management Platform 
### Transactional Ledger for Multidisciplinary Equipments and Laboratories
**Courses:** Information Management, HCI 2 and Platform Technologies.
**Institution:** Technological Institute of the Philippines - Manila

---

## 📋 Executive Summary
**FORGE** is a cloud-native, multimodal lab management system designed to revolutionize how students and faculty interact with high-value lab equipment and inventories. By integrating an **Oracle 19c enterprise ledger** with an **AWS-hosted environment**, FORGE provides a secure, real-time environment for tracking assets. The system features an **HCI-focused Progressive Web App (PWA)** that utilizes **Voice, Vision, and Haptic feedback**, allowing for hands-free operation in demanding laboratory settings.

### Problem Description
* **Touch-Inefficient Environments:** Laboratory settings often involve gloves or occupied hands, making traditional entry difficult.
* **Database Concurrency Conflicts:** Traditional systems often fail when multiple users attempt to claim limited resources simultaneously.
* **Lack of Real-Time Visibility:** Manual logs result in "ghost assets" and inefficient management.

---

## 💻 Tech Stack 
| Category | Tool / Language | Usage |
| :--- | :--- | :--- |
| **Database** | **Oracle 19c** | ACID-compliant authoritative ledger for all transactions. |
| **Backend** | **Node.js / Express.js** | Server-side logic to bridge the UI, AI, and Database. |
| **Frontend** | **React.js** | Building the PWA core with camera and voice integration. |
| **AI Engine** | **AWS Bedrock** | Image Identification engine (Claude 3 Haiku) for equipment. |
| **Design** | **Tailwind CSS / Figma** | Mapping ERDs, Cloud Architecture, and Multimodal UI. |

---

## ☁️ AWS Services 
* **Amazon RDS (Oracle 19c):** Hosting the Oracle instance on the `db.t3.micro` Free Tier.
* **Amazon S3:** Storing raw high-resolution images of equipment for audit trails.
* **AWS Bedrock:** Powering the **Claude 3 Haiku** image identification engine.
* **AWS Amplify / Beanstalk:** Hosting the PWA frontend and the Node.js backend.
* **Multimodal Integration:** Utilizing AWS services for Voice Guidance (Polly) and Speech-to-Text (Transcribe).

---

## 📦 Quick Start

### 🚀 For Professors and Teammates Testing the Project

**See the complete setup guide:** [`QUICK_START_GUIDE.md`](QUICK_START_GUIDE.md)

**Quick Setup (5 minutes):**

1. **Install Prerequisites:**
   - Node.js v24.14.0 LTS: https://nodejs.org/
   - PostgreSQL 17.6+: https://www.postgresql.org/download/
   - Git v2.48+: https://git-scm.com/

2. **Clone and Install:**
   ```bash
   git clone https://github.com/raetheemenace/Project-FORGE.git
   cd Project-FORGE
   git checkout testbranch
   
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Setup Database:**
   ```bash
   # Create database
   psql -U postgres
   CREATE DATABASE forge;
   \q
   
   # Run schema
   psql -U postgres -d forge -f backend/db/schema.sql
   ```

4. **Configure Environment:**
   ```bash
   cd backend
   cp ../.env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

5. **Run the Application:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

6. **Test:** Open http://localhost:5173

### 📚 Documentation

- **Quick Start Guide:** [`QUICK_START_GUIDE.md`](QUICK_START_GUIDE.md) - For testing and evaluation
- **Detailed Setup:** [`SETUP_INSTRUCTIONS.md`](SETUP_INSTRUCTIONS.md) - For development
- **Setup Checklist:** [`SETUP_CHECKLIST.md`](SETUP_CHECKLIST.md) - AWS deployment guide
- **Backend Setup:** [`backend/SETUP.md`](backend/SETUP.md) - Backend infrastructure
- **Database Guide:** [`backend/db/README.md`](backend/db/README.md) - Database details
- **PostgreSQL Setup:** [`docs/POSTGRESQL_SETUP.md`](docs/POSTGRESQL_SETUP.md) - Database deployment

### 🧪 Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 📦 Dependencies

### Backend (`/backend`)
- **express** v5.1.0 - REST API server
- **pg** v8.x - PostgreSQL database driver
- **jsonwebtoken** v9.0.2 - JWT authentication
- **bcrypt** v5.1.1 - Password hashing
- **@aws-sdk/client-bedrock-runtime** v3.1010.0 - AI model integration
- **@aws-sdk/client-s3** v3.1010.0 - Image storage
- **cors** v2.8.6 - Cross-origin resource sharing
- **dotenv** v17.3.1 - Environment configuration
- **nodemon** v3.1.14 - Development auto-restart
- **vitest** v2.1.8 - Testing framework
- **fast-check** v3.24.2 - Property-based testing
- **supertest** v7.0.0 - API testing

### Frontend (`/frontend`)
- **react** & **react-dom** v19.2.4 - UI framework
- **react-router-dom** v7.1.3 - Client-side routing
- **vite** v8.0.0 - Build tool and dev server
- **@vitejs/plugin-react** v6.0.0 - React support for Vite
- **axios** v1.13.6 - HTTP client
- **tailwindcss** v4.2.1 - Utility-first CSS
- **lucide-react** v0.577.0 - Icon library
- **vitest** v2.1.8 - Testing framework
- **@testing-library/react** v16.1.0 - Component testing
- **fast-check** v3.24.2 - Property-based testing
- **jsdom** v25.0.1 - DOM environment for tests

---

## 👥 The FORGE Team
| Name | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **John Raven S. Unera** | **Fullstack & Integration** | AWS Infrastructure (RDS, Bedrock, S3), Frontend/Backend bridging, and GitHub management. |
| **Adonis, Kate Russel E.** | **Backend Developer** | Node.js/Express.js server-side logic and Oracle 19c SQL architecture. |
| **Valdez, Zoe Felicia L.** | **Frontend Developer** | React.js PWA development, Multimodal HCI (Voice, Vision, Haptics). |
