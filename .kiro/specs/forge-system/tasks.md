# Implementation Plan

- [x] 1. Set up project infrastructure and database schema





  - Create Oracle DB schema with all tables (FORGE_USERS, FORGE_EQUIPMENT, FORGE_TRANSACTIONS, FORGE_TXN_ITEMS, FORGE_MAINTENANCE, FORGE_SCAN_LOG, FORGE_LAB_ROOMS, FORGE_EQUIPMENT_EVENTS, FORGE_ADMIN_ACTIONS, FORGE_MAINTENANCE_TICKETS, FORGE_ANALYTICS_DAILY)
  - Configure Oracle connection pool in backend/db/pool.js
  - Set up JWT secret and AWS credentials in backend .env
  - Install fast-check for property-based testing
  - _Requirements: 12.1, 16.3_


- [x] 2. Implement authentication system


  - [x] 2.1 Create JWT middleware for token verification





    - Write backend/middleware/auth.js with JWT decode and role extraction
    - _Requirements: 1.7_
  
  - [x] 2.2 Implement sign in and sign up endpoints


    - Create POST /api/auth/signin endpoint with credential validation
    - Create POST /api/auth/signup endpoint with Student ID validation
    - Generate JWT tokens with role information
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_
  
  - [x] 2.3 Write property test for Student ID validation


    - **Property 1: Student ID format rejection**
    - **Validates: Requirements 1.4**
  

  - [x] 2.4 Write property test for JWT role round trip

    - **Property 2: JWT role round trip**
    - **Validates: Requirements 1.6**
  
  - [x] 2.5 Write property test for empty field form rejection


    - **Property 3: Empty field form rejection**
    - **Validates: Requirements 1.5**
  
  - [x] 2.6 Create frontend auth service and hooks


    - Implement frontend/src/services/authService.js with sign in/sign up API calls
    - Create frontend/src/hooks/useAuth.js for JWT state management
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 3. Build frontend authentication pages



  - [x] 3.1 Create Sign In page

    - Implement frontend/src/pages/SignIn.jsx with form validation
    - Handle invalid credentials error display
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 3.2 Create Sign Up page

    - Implement frontend/src/pages/SignUp.jsx with Student ID validation
    - Display validation errors inline
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 3.3 Create Landing Page

    - Implement frontend/src/pages/LandingPage.jsx with feature sections and workflow steps
    - Add navigation to Sign In and Sign Up
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement transaction ID generator
  - [x] 4.1 Create transaction ID utility
    - Write backend/utils/txnId.js with TXN-YYYYMMDD-NNN format generation
    - Query Oracle for daily sequence number
    - _Requirements: 12.3_
  
  - [x] 4.2 Write property test for transaction ID format
    - **Property 5: Transaction ID format invariant**
    - **Validates: Requirements 12.3**
  
  - [x] 4.3 Write property test for transaction ID uniqueness
    - **Property 6: Transaction ID uniqueness**
    - **Validates: Requirements 12.3**

- [x] 5. Build Student Dashboard
  - [x] 5.1 Create dashboard backend endpoint
    - Implement GET /api/dashboard to fetch active transactions, lab rooms, and high-demand equipment
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 5.2 Create Dashboard page component
    - Implement frontend/src/pages/Dashboard.jsx with navigation cards
    - Display live clock using useClock hook
    - Show laboratory rooms and high-demand equipment sections
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 5.3 Create live clock hook
    - Implement frontend/src/hooks/useClock.js with 1-second interval updates
    - _Requirements: 3.6_

- [x] 6. Implement Borrow an Item flow - Step 1 (Department Selection)
  - [x] 6.1 Create BorrowStep1 component
    - Implement frontend/src/pages/borrow/BorrowStep1.jsx with department cards
    - Add step progress indicators
    - Add TTS toggle button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement Borrow an Item flow - Step 2 (Borrowing Details)
  - [x] 7.1 Create BorrowStep2 component
    - Implement frontend/src/pages/borrow/BorrowStep2.jsx with form fields
    - Add date picker with past date validation
    - Add time slot dropdown
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 7.2 Write property test for past date rejection
    - **Property 4: Past date rejection**
    - **Validates: Requirements 5.4**

- [x] 8. Implement AI Equipment Scanner
  - [x] 8.1 Create scanner backend endpoint
    - Implement POST /api/scanner/identify to invoke AWS Bedrock Claude 3
    - Send camera image to Bedrock and parse equipment identification response
    - Store scan in FORGE_SCAN_LOG table
    - _Requirements: 6.2, 6.3, 6.6_
  
  - [x] 8.2 Create BorrowStep3 component
    - Implement frontend/src/pages/borrow/BorrowStep3.jsx with camera viewfinder
    - Add scan button and "Add to Cart" functionality
    - Display scanned items list with item count
    - Handle AI Scanner errors with retry option
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 8.3 Write property test for scanned items cart growth
    - **Property 8: Scanned items cart growth**
    - **Validates: Requirements 6.4**

- [x] 9. Implement Borrow an Item flow - Step 4 (Review Summary)
  - [x] 9.1 Create transaction creation endpoint
    - Implement POST /api/transactions to create transaction with ACID compliance
    - Generate unique Transaction ID using txnId utility
    - Insert transaction and items atomically
    - Handle concurrency conflicts
    - _Requirements: 7.3, 7.5, 7.6, 12.1, 12.2, 12.3, 12.4_
  
  - [x] 9.2 Create BorrowStep4 component
    - Implement frontend/src/pages/borrow/BorrowStep4.jsx with review summary
    - Display all session and equipment details
    - Add "Confirm and Log Borrowing" button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [x] 9.3 Write property test for atomic transaction persistence
    - **Property 7: Atomic transaction persistence**
    - **Validates: Requirements 7.6, 12.4**

- [x] 10. Create transaction confirmation page
  - [x] 10.1 Create LogUpdated component
    - Implement frontend/src/pages/LogUpdated.jsx with success message
    - Add "Back to Dashboard" navigation
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 11. Implement My Transactions page
  - [x] 11.1 Create transactions list endpoint
    - Implement GET /api/transactions to fetch student transactions ordered by date descending
    - _Requirements: 9.1_
  
  - [x] 11.2 Create MyTransactions component
    - Implement frontend/src/pages/MyTransactions.jsx with transaction list
    - Display summary counters for Active, Pending Return, and Claim ID
    - Show transaction details on row tap
    - Handle empty state
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 11.3 Write property test for transaction list ordering
    - **Property 9: Transaction list ordering**
    - **Validates: Requirements 9.1**

- [x] 12. Implement maintenance reporting
  - [x] 12.1 Create maintenance report endpoint
    - Implement POST /api/maintenance to create maintenance report
    - Validate Severity and Description fields
    - _Requirements: 10.5, 10.6_
  
  - [x] 12.2 Create ReportMaintenance component
    - Implement frontend/src/pages/ReportMaintenance.jsx with QR scanner
    - Auto-fill Equipment ID from QR scan
    - Add severity dropdown and description text area
    - Display success confirmation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 12.3 Write property test for maintenance report field validation
    - **Property 10: Maintenance report field validation**
    - **Validates: Requirements 10.4**

- [x] 13. Implement multimodal accessibility features
  - [x] 13.1 Create TTS service and hook
    - Implement POST /api/tts/synthesize to invoke AWS Polly
    - Create frontend/src/hooks/useTTS.js for voice readback
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [x] 13.2 Create STT service and hook
    - Implement POST /api/stt/transcribe to invoke AWS Transcribe
    - Create frontend/src/hooks/useSTT.js for voice input
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [x] 13.3 Add TTS toggle to all borrow flow steps
    - Update BorrowStep1, BorrowStep2, BorrowStep3, BorrowStep4 with TTS toggle
    - Implement voice readback for page content
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [x] 13.4 Write property test for TTS toggle state consistency
    - **Property 12: TTS toggle state consistency**
    - **Validates: Requirements 11.1**

- [x] 14. Implement equipment image storage
  - [x] 14.1 Create S3 image URL endpoint
    - Implement GET /api/equipment/image-url/:id to generate pre-signed S3 URLs
    - Set 7-day expiry on pre-signed URLs
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 14.2 Write property test for pre-signed S3 URL expiry
    - **Property 11: Pre-signed S3 URL expiry**
    - **Validates: Requirements 13.3**

- [x] 15. Implement responsive layout and PWA features
  - [x] 15.1 Create responsive layout components
    - Implement frontend/src/components/layout/MobileHeader.jsx
    - Implement frontend/src/components/layout/WebHeader.jsx
    - Add mobile-first responsive breakpoints to all pages
    - _Requirements: 14.1_
  
  - [x] 15.2 Configure PWA manifest and service worker
    - Create manifest.json with app metadata
    - Configure Vite PWA plugin for offline caching
    - Create frontend/src/pages/OfflinePage.jsx
    - _Requirements: 14.2, 14.3_

- [x] 16. Checkpoint - Ensure all student-facing features are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement Admin Dashboard
  - [x] 17.1 Create admin dashboard endpoint
    - Implement GET /api/admin/analytics with role verification
    - Return summary statistics: active transactions, open tickets, equipment availability, registered users
    - _Requirements: 15.1, 15.10_
  
  - [x] 17.2 Create AdminDashboard component
    - Implement frontend/src/pages/admin/AdminDashboard.jsx with summary cards
    - Display key metrics and alerts
    - _Requirements: 15.1_
  
  - [x] 17.3 Write property test for admin role authorization
    - **Property 13: Admin role authorization**
    - **Validates: Admin access control**

- [x] 18. Implement Equipment Management
  - [x] 18.1 Create equipment CRUD endpoints
    - Implement GET /api/admin/equipment to list all equipment
    - Implement POST /api/admin/equipment to create equipment
    - Implement PUT /api/admin/equipment/:id to update equipment
    - Implement DELETE /api/admin/equipment/:id to mark as disposed
    - Upload equipment images to S3 on creation
    - Log all actions to FORGE_ADMIN_ACTIONS
    - _Requirements: 15.2, 15.9_
  
  - [x] 18.2 Create EquipmentManagement component
    - Implement frontend/src/pages/admin/EquipmentManagement.jsx with equipment table
    - Add create/edit/delete modals
    - Add image upload functionality
    - _Requirements: 15.2_
  
  - [x] 18.3 Write property test for equipment ID uniqueness
    - **Property 14: Equipment ID uniqueness on creation**
    - **Validates: Equipment inventory integrity**

- [x] 19. Implement Transaction Oversight
  - [x] 19.1 Create transaction oversight endpoints
    - Implement GET /api/admin/transactions to list all transactions with filters
    - Implement PATCH /api/admin/transactions/:id to override transaction status
    - Log all status changes to FORGE_ADMIN_ACTIONS
    - _Requirements: 15.3, 15.4, 15.9_
  
  - [x] 19.2 Create TransactionOversight component
    - Implement frontend/src/pages/admin/TransactionOversight.jsx with transaction table
    - Add filters for status, department, date range, student
    - Add status override functionality
    - _Requirements: 15.3, 15.4_

- [x] 20. Implement Maintenance Ticket Management
  - [x] 20.1 Create maintenance ticket endpoints
    - Implement GET /api/admin/tickets to list all tickets
    - Implement POST /api/admin/tickets to create ticket from report
    - Implement PATCH /api/admin/tickets/:id to update status/assignment
    - Log all ticket actions to FORGE_ADMIN_ACTIONS
    - _Requirements: 15.5, 15.9_
  
  - [x] 20.2 Create MaintenanceTickets component
    - Implement frontend/src/pages/admin/MaintenanceTickets.jsx with ticket workflow
    - Add assignment and status update functionality
    - Display ticket details with resolution notes
    - _Requirements: 15.5_
  
  - [x] 20.3 Write property test for maintenance ticket lifecycle
    - **Property 15: Maintenance ticket lifecycle**
    - **Validates: Maintenance workflow integrity**

- [x] 21. Implement User Management
  - [x] 21.1 Create user management endpoints
    - Implement GET /api/admin/users to list all users
    - Implement PATCH /api/admin/users/:id to disable/enable accounts
    - Log all user actions to FORGE_ADMIN_ACTIONS
    - _Requirements: 15.6, 15.9_
  
  - [x] 21.2 Create UserManagement component
    - Implement frontend/src/pages/admin/UserManagement.jsx with user table
    - Add disable/enable account functionality
    - _Requirements: 15.6_

- [x] 22. Implement Lab Room Management
  - [x] 22.1 Create lab room CRUD endpoints
    - Implement GET /api/admin/rooms to list all rooms
    - Implement POST /api/admin/rooms to create room
    - Implement PUT /api/admin/rooms/:id to update room
    - Implement DELETE /api/admin/rooms/:id to deactivate room
    - Log all actions to FORGE_ADMIN_ACTIONS
    - _Requirements: 15.7, 15.9_
  
  - [x] 22.2 Create LabRoomManagement component
    - Implement frontend/src/pages/admin/LabRoomManagement.jsx with room table
    - Add create/edit/deactivate functionality
    - _Requirements: 15.7_

- [x] 23. Implement System Reports and Audit Log
  - [x] 23.1 Create analytics and audit endpoints
    - Implement GET /api/admin/analytics to fetch daily analytics per department
    - Implement GET /api/admin/audit-log to fetch admin action history
    - _Requirements: 15.8, 15.9_
  
  - [x] 23.2 Create SystemReports component
    - Implement frontend/src/pages/admin/SystemReports.jsx with analytics dashboard
    - Display daily metrics: total transactions, equipment borrowed, maintenance reports, avg session duration
    - Add audit log viewer
    - _Requirements: 15.8, 15.9_
  
  - [x] 23.3 Write property test for admin action audit completeness
    - **Property 16: Admin action audit completeness**
    - **Validates: Admin accountability**

- [x] 24. Implement UI components library
  - [x] 24.1 Create reusable UI components
    - Implement frontend/src/components/ui/Badge.jsx for status badges
    - Implement frontend/src/components/ui/ProgressBar.jsx for time-remaining display
    - Implement frontend/src/components/ui/StepIndicator.jsx for step progress dots
    - Implement frontend/src/components/ui/TTSToggle.jsx for TTS toggle button
    - _Requirements: 3.4, 4.4_

- [ ] 25. Configure AWS infrastructure
  - [ ] 25.1 Set up AWS Amplify hosting
    - Configure Amplify app for frontend deployment
    - Set up build settings for Vite
    - _Requirements: 16.1_
  
  - [ ] 25.2 Set up AWS Elastic Beanstalk
    - Configure Elastic Beanstalk environment for Express.js backend
    - Set environment variables for DB and AWS credentials
    - _Requirements: 16.2_
  
  - [ ] 25.3 Configure Amazon RDS Oracle instance
    - Create Oracle 19c RDS instance
    - Run schema creation scripts
    - Update backend connection string
    - _Requirements: 16.3_
  
  - [ ] 25.4 Configure AWS Bedrock access
    - Enable Claude 3 Haiku model in Bedrock
    - Set up IAM permissions for backend
    - _Requirements: 16.4_
  
  - [ ] 25.5 Configure AWS S3 bucket
    - Create S3 bucket for equipment images
    - Set up CORS and bucket policies
    - _Requirements: 16.7_
  
  - [ ] 25.6 Configure AWS Polly and Transcribe
    - Enable Polly for TTS synthesis
    - Enable Transcribe for STT processing
    - _Requirements: 16.5, 16.6_

- [ ] 26. Final Checkpoint - Ensure all tests pass and system is production-ready
  - Ensure all tests pass, ask the user if questions arise.
