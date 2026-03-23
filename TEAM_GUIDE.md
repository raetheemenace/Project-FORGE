# FORGE Team Guide

Complete guide for teammates working on the FORGE project.

## Quick Setup (5 Minutes)

### Prerequisites
- Node.js v24.14.0 (LTS)
- Git v2.48+

### Installation

```bash
# 1. Clone repository
git clone https://github.com/raetheemenace/Project-FORGE.git
cd Project-FORGE

# 2. Extract credentials
unzip env-secrets.zip

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps

# 4. Start servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Test
Open http://localhost:5173 and sign up with any 7-8 digit Student ID.

## Project Structure

```
Project-FORGE/
├── backend/              # Node.js/Express API
│   ├── db/              # Database schema & connection
│   ├── routes/          # API endpoints
│   ├── middleware/      # Authentication
│   ├── utils/           # Utilities & tests
│   └── index.js         # Main server
│
├── frontend/            # React PWA
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom hooks
│   │   └── services/   # API services
│   └── public/         # Static assets
│
└── docs/               # Deployment guides
```

## Tech Stack

**Backend:** Node.js 24, Express 5, PostgreSQL 17.6, AWS SDK  
**Frontend:** React 19, Vite 8, Tailwind CSS 4  
**Cloud:** AWS RDS, S3, Bedrock, Polly, Transcribe

## Common Commands

### Backend
```bash
npm run dev      # Development with auto-restart
npm test         # Run tests
npm start        # Production
```

### Frontend
```bash
npm run dev      # Development server
npm test         # Run tests
npm run build    # Production build
npm run lint     # Run linter
```

## Development Workflow

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**
   ```bash
   npm test
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request on GitHub**

## Database

**Connection:** PostgreSQL RDS (ap-southeast-1)  
**Schema:** 11 tables, 3NF normalized  
**Access:** Credentials in `backend/.env`

**Tables:**
- forge_users - User accounts
- forge_equipment - Equipment inventory
- forge_transactions - Borrowing transactions
- forge_txn_items - Transaction items
- forge_maintenance - Maintenance reports
- forge_scan_log - AI scanner audit
- forge_lab_rooms - Lab rooms
- forge_equipment_events - Equipment lifecycle
- forge_admin_actions - Admin audit log
- forge_maintenance_tickets - Maintenance workflow
- forge_analytics_daily - Daily analytics

**Tools:** DBeaver, pgAdmin, or TablePlus

## Security

**CRITICAL:**
- ✅ Never commit `.env` files
- ✅ No hardcoded credentials
- ✅ All secrets in `env-secrets.zip` only
- ✅ Use parameterized SQL queries

**Environment Variables:**
All configuration in `backend/.env`:
- Database credentials
- AWS access keys
- JWT secret
- S3 bucket name

## Testing

**Backend Tests:**
```bash
cd backend
npm test
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Property-Based Testing:**
Using `fast-check` for robust testing of:
- Authentication logic
- Transaction IDs
- Database operations
- QR code generation

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in

### Equipment
- `GET /api/equipment` - List equipment
- `POST /api/scanner/identify` - AI identification

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction

### Admin
- `GET /api/admin/analytics` - Dashboard
- `GET /api/admin/equipment` - Manage equipment
- `GET /api/admin/users` - Manage users
- `GET /api/admin/tickets` - Maintenance tickets

## Troubleshooting

### Backend won't start
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

### Database connection fails
- Check `backend/.env` exists
- Verify credentials are correct
- Contact team lead for updated credentials

### AI Scanner rate limit
- Wait 1-2 minutes between scans
- AWS Bedrock free tier: 4 requests/minute

## AWS Services

**Pre-configured:**
- ✅ RDS PostgreSQL - Database
- ✅ S3 - Image storage
- ✅ Bedrock - AI identification (Claude 3)
- ✅ Polly - Text-to-speech
- ✅ Transcribe - Speech-to-text

**Credentials:** In `env-secrets.zip`

## Deployment

See `docs/AWS_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

**Quick Deploy:**
- Frontend: AWS Amplify
- Backend: AWS Elastic Beanstalk
- Database: AWS RDS PostgreSQL

## Team

- **John Raven S. Unera** - Fullstack & AWS Integration
- **Kate Russel E. Adonis** - Backend Development
- **Zoe Felicia L. Valdez** - Frontend Development

## Documentation

- **README.md** - Project overview
- **FOR_PROFESSORS.md** - Evaluation guide
- **TEAM_GUIDE.md** - This file
- **backend/SETUP.md** - Backend details
- **backend/db/README.md** - Database details
- **docs/AWS_DEPLOYMENT_GUIDE.md** - Deployment

## Need Help?

1. Check this guide
2. Review troubleshooting section
3. Check existing documentation
4. Ask in team chat
5. Contact team lead

---

**Institution:** Technological Institute of the Philippines - Manila  
**Courses:** Information Management, HCI 2, Platform Technologies
