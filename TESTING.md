# FORGE Testing Instructions

## Quick Review (For Progress Checking)

**If you just want to review progress without running the application:**

1. **View Project Documentation:**
   - [README.md]

2. **Review Code Structure:**
   - Browse `backend/` for Express.js API implementation
   - Browse `frontend/src/` for React components
   - Check test files (`.test.js` suffix) for unit and property-based tests
   - Review commit history to see implementation progress


**For early-stage progress checking:** Documentation review and code inspection are sufficient. No local setup or deployment needed yet.

**For final testing:** Once development is complete, the application will be deployed to AWS for full end-to-end testing.

---

## Full Local Setup (For Development & Testing)

**Only needed if you want to run the application locally or contribute to development.**

### Prerequisites

- Node.js v24.14.0 (LTS)
- npm v11.9.0
- Oracle 19c database access (RDS endpoint)
- AWS credentials configured for Bedrock, S3, Polly, and Transcribe

---

## Backend Testing

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file with:
```
DB_USER=your_oracle_username
DB_PASSWORD=your_oracle_password
DB_CONNECTION_STRING=your_rds_endpoint
AWS_REGION=us-east-1
PORT=5000
JWT_SECRET=your_jwt_secret
```

### 4. Run backend tests
```bash
npm test
```

### 5. Start backend server
```bash
npm run dev
```
Backend will run on `http://localhost:5000`

---

## Frontend Testing

### 1. Navigate to frontend directory
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run frontend tests
```bash
npm test
```

### 4. Start development server
```bash
npm run dev
```
Frontend will run on `http://localhost:5173`

---

## Property-Based Testing

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) and run 100+ iterations per property.

### Run all property tests

**Backend property tests:**
```bash
cd backend
npm test -- --grep "Property"
```

**Frontend property tests:**
```bash
cd frontend
npm test -- --grep "Property"
```

---

## Manual Testing Checklist

### Student Flow
- [ ] Sign up with 7-digit Student ID
- [ ] Sign in with valid credentials
- [ ] View dashboard with live clock
- [ ] Navigate through 4-step borrowing flow
- [ ] Use AI scanner to identify equipment
- [ ] Review and confirm transaction
- [ ] View transaction history
- [ ] Report maintenance issue via QR scan

### Admin Flow
- [ ] Sign in as Lab Admin
- [ ] View admin dashboard statistics
- [ ] Create/update/delete equipment
- [ ] Override transaction status
- [ ] Manage maintenance tickets
- [ ] View system analytics

### Multimodal Features
- [ ] Toggle TTS on/off during borrowing flow
- [ ] Use STT voice input on scanner step
- [ ] Verify voice feedback indicators

### PWA Features
- [ ] Install PWA on mobile device
- [ ] Test offline behavior
- [ ] Verify responsive layout (375px, 768px, 1440px)

---

## Deployment Testing (Available After Project Completion)

Once development is complete, the application will be deployed to AWS:

### Frontend (AWS Amplify)
```
https://your-app-id.amplifyapp.com
```

### Backend API (AWS Elastic Beanstalk)
```
https://your-env.elasticbeanstalk.com/api/health
```

**Note:** Deployment URLs will be updated here once the application is deployed.

---

## Test Accounts

### Student Account
- **Username:** `student@tip.edu.ph`
- **Password:** `Student123!`
- **Student ID:** `2021001`

### Admin Account
- **Username:** `admin@tip.edu.ph`
- **Password:** `Admin123!`
- **Role:** LAB_ADMIN

---

## Known Limitations

- AWS Bedrock requires valid AWS credentials and enabled Claude 3 model
- Camera access requires HTTPS or localhost
- TTS/STT features require AWS Polly and Transcribe access
- Oracle RDS must be accessible from your network

---

## Troubleshooting

### Backend won't start
- Verify Oracle connection string is correct
- Check AWS credentials are configured (`aws configure`)
- Ensure port 5000 is not already in use

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS configuration in backend
- Ensure axios baseURL points to correct backend URL

### Tests failing
- Run `npm install` to ensure all dependencies are installed
- Check that test database schema is created
- Verify environment variables are set correctly

### AWS services not working
- Confirm AWS credentials have necessary permissions
- Check AWS region is set correctly
- Verify Bedrock Claude 3 model is enabled in your region
