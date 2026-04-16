# FORGE - Lab Equipment Management System

A comprehensive cloud-based laboratory equipment management system built with modern web technologies and AWS services.

## 🎓 For Professors

**Please read [FOR_PROFESSORS.md](FOR_PROFESSORS.md) for quick setup and evaluation instructions.**

## 📋 Project Overview

FORGE is an enterprise-grade lab management system that demonstrates:
- Cloud-native architecture (AWS)
- AI-powered equipment identification (AWS Bedrock)
- ACID-compliant transaction management
- Progressive Web App (PWA) capabilities
- Multimodal accessibility features

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: Node.js 24)
- npm or yarn
- PostgreSQL client (optional, for database inspection)

### Installation

1. **Extract credentials** (provided separately):
   ```bash
   unzip env-secrets.zip
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```

4. **Start the application**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 🏗️ Technology Stack

### Frontend
- React 19
- Vite 8
- Tailwind CSS 4
- React Router 7

### Backend
- Node.js 24
- Express 5
- PostgreSQL 17.6

### AWS Services
- RDS (PostgreSQL database)
- S3 (image storage)
- Bedrock (AI/Claude 3 Haiku)
- Polly (text-to-speech)
- Transcribe (speech-to-text)
- Amplify (frontend hosting)
- Elastic Beanstalk (backend hosting)

## 📁 Project Structure

```
forge/
├── backend/              # Node.js/Express API
│   ├── db/              # Database schemas and migrations
│   ├── routes/          # API endpoints
│   ├── middleware/      # Authentication & validation
│   └── utils/           # Helper functions & tests
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── services/    # API service layer
│   └── public/          # Static assets
└── docs/                # Documentation (if available)
```

## 🔑 Security Notes

- All sensitive credentials have been removed from this repository
- The `env-secrets.zip` file contains necessary credentials for evaluation
- AWS credentials are for evaluation purposes only
- Production deployment uses separate, secured credentials

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📚 Key Features

1. **AI Equipment Scanner** - Camera-based equipment identification using AWS Bedrock
2. **Transaction Management** - ACID-compliant borrowing/return system
3. **Admin Dashboard** - Comprehensive management interface
4. **Multimodal Accessibility** - Voice input/output for hands-free operation
5. **PWA Support** - Installable on mobile devices
6. **Real-time Updates** - Live equipment availability tracking

## 🎯 Academic Context

- **Course**: Information Management, HCI 2, Platform Technologies
- **Institution**: Technological Institute of the Philippines - Manila
- **Purpose**: Demonstrate enterprise-grade cloud architecture and modern web development practices

## 📖 Documentation

- [FOR_PROFESSORS.md](FOR_PROFESSORS.md) - Quick evaluation guide
- [backend/SETUP.md](backend/SETUP.md) - Backend setup details
- [frontend/README.md](frontend/README.md) - Frontend documentation

## 🤝 Contributing

This is an academic project. For questions or issues, please contact the development team.

## 📄 License

This project is for academic evaluation purposes.

---

**Note**: This system is designed for educational demonstration and requires AWS services to function fully.
