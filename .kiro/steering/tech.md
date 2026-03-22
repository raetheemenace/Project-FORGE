---
inclusion: always
---

# Technology Stack

## Architecture

Full-stack cloud-native application with separate frontend and backend services.

## Backend (`/backend`)

- **Runtime:** Node.js v24.14.0 (LTS)
- **Framework:** Express.js v5.1.0 (CommonJS modules)
- **Database:** PostgreSQL 17.6-R2 via pg driver
- **AWS Services:**
  - AWS Bedrock (Claude 3 models for image identification)
  - AWS S3 (equipment image storage)
- **Key Dependencies:**
  - `express` v5.1.0 - REST API server
  - `pg` v8.x - PostgreSQL database connectivity
  - `@aws-sdk/client-bedrock-runtime` v3.7xx.x - AI model invocation
  - `@aws-sdk/client-s3` v3.7xx.x - S3 storage operations
  - `cors` v2.8.x - Cross-origin resource sharing
  - `dotenv` v16.4.x - Environment variable management
  - `nodemon` v3.1.x (dev) - Auto-restart during development

## Frontend (`/frontend`)

- **Framework:** React v19.2.4
- **Build Tool:** Vite v8.0.x
- **Module System:** ES modules
- **Styling:** Tailwind CSS v4.2.1
- **Key Dependencies:**
  - `react` & `react-dom` v19.2.4
  - `axios` v1.13.6 - HTTP client for backend communication
  - `lucide-react` v0.577.0 - Icon library
  - `@vitejs/plugin-react` v6.0.0 - React support for Vite
  - ESLint v9.39.4 - Code linting

## AWS Infrastructure

- **Amazon RDS:** PostgreSQL 17.6-R2 instance (db.t3.micro Free Tier)
- **Amazon S3:** High-resolution equipment image storage
- **AWS Bedrock:** Claude 3 Haiku/Sonnet for equipment identification
- **AWS Amplify/Beanstalk:** Hosting for PWA and backend services
- **AWS Polly:** Voice guidance (planned)
- **AWS Transcribe:** Speech-to-text (planned)

## Common Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev             # Start with nodemon (auto-restart)
npm start               # Production start
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start Vite dev server
npm run build           # Production build
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

## Environment Configuration

Backend requires `.env` file with:
- `DB_USER` - PostgreSQL database username
- `DB_PASSWORD` - PostgreSQL database password
- `DB_CONNECTION_STRING` - PostgreSQL RDS endpoint
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: forge)
- `AWS_REGION` - AWS region for Bedrock/S3
- `PORT` - Server port (default: 5000)

## Prerequisites

- Node.js v24.14.0 (LTS)
- npm v11.9.0
- git v2.48+
- AWS credentials configured for Bedrock and S3 access
