# Design Document: lab-system-full-integration

## Overview

This document describes the technical design for the full-stack integration of the FORGE laboratory equipment borrowing system. The integration spans six concern areas:

1. Auth flow (signup/signin) persisted to PostgreSQL `forge_users` via `backend/routes/auth.js`
2. AI camera on BorrowStep3 using AWS Bedrock Claude 3 to identify lab equipment, with audit logging to `forge_scan_log`
3. QR scanner with a working camera feed using `html5-qrcode`, resolving equipment from `forge_equipment`
4. Automated test suite for the AI scanner integration (Vitest)
5. All 11 `forge_*` tables wired end-to-end between the React frontend and the Node.js/Express backend

The system is already substantially implemented. This design documents the intended architecture, identifies the contracts between layers, and specifies correctness properties that must hold across all valid executions.

---

## Architecture

```mermaid
graph TD
  subgraph Frontend [React + Vite — /frontend/src]
    SignUp[SignUp.jsx]
    SignIn[SignIn.jsx]
    BS3[BorrowStep3.jsx]
    BS4[BorrowStep4.jsx]
    QRHook[useQRScanner.js]
    AuthSvc[authService.js]
    AdminPages[Admin Pages]
    MyTxns[MyTransactions.jsx]
  end

  subgraph Backend [Node.js/Express — /backend]
    AuthRoute[/api/auth]
    ScannerRoute[/api/scanner/identify]
    TxnRoute[/api/transactions]
    EqRoute[/api/equipment/:id]
    MaintRoute[/api/maintenance]
    AdminRoutes[/api/admin/*]
    AuthMW[middleware/auth.js]
    Pool[db/pool.js]
  end

  subgraph AWS
    Bedrock[AWS Bedrock Claude 3]
  end

  subgraph DB [PostgreSQL]
    forge_users
    forge_equipment
    forge_transactions
    forge_txn_items
    forge_scan_log
    forge_maintenance
    forge_maintenance_tickets
    forge_lab_rooms
    forge_equipment_events
    forge_admin_actions
    forge_analytics_daily
  end

  SignUp --> AuthSvc --> AuthRoute --> Pool --> forge_users
  SignIn --> AuthSvc --> AuthRoute
  BS3 --> ScannerRoute --> Bedrock
  ScannerRoute --> Pool --> forge_scan_log
  ScannerRoute --> Pool --> forge_equipment
  BS4 --> TxnRoute --> Pool --> forge_transactions
  TxnRoute --> Pool --> forge_txn_items
  QRHook --> EqRoute --> Pool --> forge_equipment
  AdminPages --> AdminRoutes --> Pool
  MyTxns --> TxnRoute
  AuthMW -.->|verifies JWT| ScannerRoute
  AuthMW -.->|verifies JWT| TxnRoute
  AuthMW -.->|verifies JWT| AdminRoutes
```

The architecture is a standard three-tier web application. The frontend communicates exclusively through the REST API. The backend owns all database access. AWS Bedrock is called only from the backend scanner route, never from the frontend.

---

## Components and Interfaces

### Auth Layer

**Frontend**
- `frontend/src/services/authService.js` — `signUp(userData)`, `signIn(fullName, studentId)`, `signOut()`, `getToken()`, `getCurrentUser()`, `setupAxiosInterceptor()`
- `frontend/src/hooks/useAuth.jsx` — React context provider wrapping `authService`; exposes `{ user, signIn, signUp, signOut, isAuthenticated, loading }`
- `frontend/src/pages/SignUp.jsx` — calls `useAuth().signUp`, navigates to `/dashboard` on success
- `frontend/src/pages/SignIn.jsx` — calls `useAuth().signIn`, navigates to `/dashboard` on success

**Backend**
- `backend/routes/auth.js`
  - `POST /api/auth/signup` — validates fields, inserts into `forge_users`, returns `{ token, user }`
  - `POST /api/auth/signin` — looks up `forge_users` by `(full_name, student_id)`, returns `{ token, user }`
- `backend/middleware/auth.js` — `authenticateToken(req, res, next)` verifies Bearer JWT; `generateToken(user)` signs a new JWT

**Token storage contract**: `authService` stores the JWT under `localStorage.token` and the user object under `localStorage.user`. The axios interceptor attaches `Authorization: Bearer <token>` to every outgoing request.

---

### AI Scanner

**Frontend** (`BorrowStep3.jsx`)
- On mount: calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` and binds the stream to a `<video>` element
- On "Scan Equipment": draws the current video frame to a hidden `<canvas>`, encodes as `image/jpeg` base64, POSTs to `/api/scanner/identify` with the JWT
- On success: renders the scan result card; calls `speak()` if TTS is enabled
- On error: renders the error overlay with a Retry button

**Backend** (`backend/routes/scanner.js`)
- `POST /api/scanner/identify` — protected by `authenticateToken`
  - Strips the `data:image/...;base64,` prefix if present
  - Builds a Bedrock `InvokeModelCommand` with the image and a structured JSON-output prompt
  - Parses the Bedrock response; falls back to `{ name: "Unknown Equipment", condition: "Fair", confidence: 0, equipmentId: null }` on parse failure
  - Resolves `equipmentId` against `forge_equipment`
  - Inserts into `forge_scan_log`
  - Returns `{ equipmentId, name, condition, confidence }`

**Bedrock prompt contract**: The prompt instructs Claude 3 to respond with exactly:
```json
{ "name": "...", "condition": "Excellent|Good|Fair|Poor", "confidence": 0-100, "equipmentId": "EQ-XXXX or null" }
```
No markdown, no extra text. The route defensively parses and falls back on any deviation.

---

### QR Scanner

**Hook** (`frontend/src/hooks/useQRScanner.js`)
- `startScanner(elementId)` — creates an `Html5QrcodeScanner` with `{ fps: 10, qrbox: { width: 250, height: 250 }, facingMode: 'environment' }`
- Decode logic:
  1. Try `JSON.parse(decodedText)` → if `data.type === 'FORGE_EQUIPMENT'` and `data.equipmentId` is non-empty → `onScanSuccess(data.equipmentId)`
  2. If JSON but missing fields → `onScanError('Invalid QR code format: Missing equipment information')`
  3. If not JSON and non-empty trimmed string → `onScanSuccess(decodedText.trim())`
  4. If empty/whitespace → `onScanError('Invalid QR code format: Unable to extract equipment ID')`
- `stopScanner()` — calls `scanner.clear()`, sets ref to null

**Equipment resolution**: After `onScanSuccess`, the calling component queries `GET /api/equipment/:id` to fetch `{ name, condition }` from `forge_equipment` and renders the result card.

---

### Transaction Flow (BorrowStep4)

- `POST /api/transactions` — protected; body: `{ department, course, timeSlot, date, labRoom, adviser, items: [{ equipmentId, name, condition }] }`
- Uses a PostgreSQL client transaction (`BEGIN` / `COMMIT` / `ROLLBACK`) to atomically insert one `forge_transactions` row and N `forge_txn_items` rows
- Returns `{ txnId, message }` with HTTP 201

- `GET /api/transactions` — protected; returns all transactions for the authenticated user, joined with `forge_txn_items` and `forge_equipment`, ordered by `txn_date DESC`

---

### Admin Routes

All admin routes are protected by `authenticateToken` + `requireRole('LAB_ADMIN')`.

| Route | Table(s) queried |
|---|---|
| `GET /api/admin/equipment` | `forge_equipment` |
| `GET /api/admin/users` | `forge_users` |
| `GET /api/admin/transactions` | `forge_transactions` ⋈ `forge_users` ⋈ `forge_txn_items` |
| `GET /api/admin/tickets` | `forge_maintenance_tickets` ⋈ `forge_maintenance` ⋈ `forge_equipment` |
| `GET /api/admin/rooms` | `forge_lab_rooms` |
| `GET /api/admin/system-reports` | `forge_analytics_daily` |
| `POST /api/admin/equipment` (create/update/delete) | `forge_equipment`, `forge_admin_actions` |
| `POST /api/admin/users` (create/update/delete) | `forge_users`, `forge_admin_actions` |
| `POST /api/admin/equipment/events` | `forge_equipment_events` |

Every mutating admin action appends a row to `forge_admin_actions` with `{ action_type, target_type, target_id, admin_id, details }`.

---

### Maintenance Flow

- `POST /api/maintenance` — protected; body: `{ equipmentId, severity, description }`
- Atomically inserts one `forge_maintenance` row and one `forge_maintenance_tickets` row with `status = 'OPEN'` and `priority` derived from `severity`

---

## Data Models

### forge_users
| Column | Type | Notes |
|---|---|---|
| user_id | SERIAL PK | |
| student_id | CHAR(7) UNIQUE NOT NULL | Exactly 7 numeric digits |
| full_name | VARCHAR(200) NOT NULL | |
| program | VARCHAR(200) | |
| role | VARCHAR(20) | 'STUDENT' or 'LAB_ADMIN' |
| created_at | TIMESTAMP | |

### forge_equipment
| Column | Type | Notes |
|---|---|---|
| equipment_id | VARCHAR(20) PK | e.g. EQ-7167 |
| name | VARCHAR(200) NOT NULL | |
| department | VARCHAR(50) NOT NULL | |
| s3_image_key | VARCHAR(500) | |
| status | VARCHAR(20) | 'AVAILABLE', etc. |

### forge_transactions / forge_txn_items
`forge_transactions` holds the session header (user, date, room, adviser). `forge_txn_items` holds one row per piece of equipment borrowed, referencing both `forge_transactions` and `forge_equipment`.

### forge_scan_log
| Column | Type | Notes |
|---|---|---|
| scan_id | SERIAL PK | |
| user_id | INTEGER FK → forge_users | |
| equipment_id | VARCHAR(20) FK → forge_equipment | Nullable |
| bedrock_response | TEXT | Raw Claude 3 JSON |
| predicted_name | VARCHAR(200) | |
| confidence_score | DECIMAL(5,2) | |
| created_at | TIMESTAMP | |

### forge_maintenance / forge_maintenance_tickets
`forge_maintenance` stores the student-submitted report. `forge_maintenance_tickets` stores the workflow state (`OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`), assigned admin, and resolution text.

### forge_admin_actions
Append-only audit log. Every admin mutation writes one row with `action_type`, `target_type`, `target_id`, `admin_id`, and a `details` JSON blob.

### forge_equipment_events
Lifecycle events (`PROCURED`, `TRANSFERRED`, `DISPOSED`, `CALIBRATED`) with `from_location` / `to_location` for transfers.

### forge_analytics_daily
Daily rollup keyed on `(report_date, department)`. Populated by a background job or trigger; read by the System Reports admin page.

### forge_lab_rooms
Static room definitions (`room_id`, `room_name`, `department`, `capacity`, `status`).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Signup round-trip persists user

*For any* valid (fullName, studentId, program) triple where studentId matches `/^\d{7}$/`, calling `POST /api/auth/signup` should return HTTP 201 with a non-empty JWT, and a subsequent query to `forge_users` by that studentId should return exactly one matching row.

**Validates: Requirements 1.1**

---

### Property 2: Invalid studentId format is rejected

*For any* string that does not match `/^\d{7}$/` (too short, too long, contains non-digits), submitting it as `studentId` to `POST /api/auth/signup` should return HTTP 400.

**Validates: Requirements 1.3**

---

### Property 3: Missing required signup fields are rejected

*For any* non-empty proper subset of `{studentId, fullName, program}` that is omitted from the signup request body, the route should return HTTP 400 with the message "All fields are required: studentId, fullName, program".

**Validates: Requirements 1.4**

---

### Property 4: Signin round-trip authenticates existing user

*For any* user that has been successfully inserted into `forge_users`, calling `POST /api/auth/signin` with that user's `fullName` and `studentId` should return HTTP 200 with a non-empty JWT and a user object whose `studentId` matches the input.

**Validates: Requirements 2.1**

---

### Property 5: Non-existent credentials are rejected

*For any* (fullName, studentId) pair that does not correspond to a row in `forge_users`, calling `POST /api/auth/signin` should return HTTP 401 with the message "Invalid credentials".

**Validates: Requirements 2.2**

---

### Property 6: Missing signin fields are rejected

*For any* request to `POST /api/auth/signin` that omits `fullName`, `studentId`, or both, the route should return HTTP 400.

**Validates: Requirements 2.3**

---

### Property 7: Scanner response schema invariant

*For any* valid base64 JPEG image sent to `POST /api/scanner/identify`, the response `condition` field must be exactly one of `"Excellent"`, `"Good"`, `"Fair"`, or `"Poor"` — never any other value.

**Validates: Requirements 3.4, 5.8**

---

### Property 8: Known equipmentId is resolved from forge_equipment

*For any* Bedrock response that contains an `equipmentId` matching a row in `forge_equipment`, the scanner route should return that same `equipment_id` in the response. For any `equipmentId` that does not exist in `forge_equipment`, the route should return `null`.

**Validates: Requirements 3.5**

---

### Property 9: Successful scan is logged to forge_scan_log

*For any* successful call to `POST /api/scanner/identify`, exactly one row should be inserted into `forge_scan_log` with the correct `user_id`, `predicted_name`, and `confidence_score` matching the Bedrock response.

**Validates: Requirements 3.6, 5.5, 6.9**

---

### Property 10: QR FORGE_EQUIPMENT JSON triggers success callback

*For any* non-empty `equipmentId` string, a QR code payload of `{"type":"FORGE_EQUIPMENT","equipmentId":"<id>"}` decoded by `useQRScanner` should invoke `onScanSuccess` with exactly that `equipmentId`.

**Validates: Requirements 4.2**

---

### Property 11: Non-JSON QR payload triggers success callback with trimmed text

*For any* non-empty, non-JSON string decoded by `useQRScanner`, `onScanSuccess` should be invoked with the trimmed version of that string.

**Validates: Requirements 4.3**

---

### Property 12: Invalid JSON QR payload triggers error callback

*For any* JSON object decoded by `useQRScanner` that is missing `type` or `equipmentId`, `onScanError` should be invoked with the message "Invalid QR code format: Missing equipment information".

**Validates: Requirements 4.4**

---

### Property 13: Whitespace QR payload triggers error callback

*For any* string composed entirely of whitespace characters decoded by `useQRScanner`, `onScanError` should be invoked with the message "Invalid QR code format: Unable to extract equipment ID".

**Validates: Requirements 4.5**

---

### Property 14: Transaction creation is atomic

*For any* valid transaction payload with N items, `POST /api/transactions` should atomically insert exactly one `forge_transactions` row and exactly N `forge_txn_items` rows, returning HTTP 201 with a `txnId`. If any insert fails, neither table should contain the partial data.

**Validates: Requirements 6.1**

---

### Property 15: Transaction list is complete and ordered

*For any* authenticated user with N transactions in `forge_transactions`, `GET /api/transactions` should return exactly N transactions ordered by `txn_date` descending, each including its associated `forge_txn_items` and `forge_equipment` data.

**Validates: Requirements 6.2**

---

### Property 16: Admin list endpoints return all rows

*For any* set of rows in `forge_equipment`, `forge_users`, `forge_lab_rooms`, or `forge_analytics_daily`, the corresponding admin GET endpoint should return all rows without omission.

**Validates: Requirements 6.3, 6.4, 6.10, 6.11**

---

### Property 17: Maintenance report atomically creates report and ticket

*For any* valid maintenance report submission, the maintenance route should atomically insert one `forge_maintenance` row and one `forge_maintenance_tickets` row with `status = 'OPEN'`. If either insert fails, neither row should be committed.

**Validates: Requirements 6.7**

---

### Property 18: Admin mutations are audited

*For any* create, update, or delete action performed by an admin on equipment or users, exactly one row should be inserted into `forge_admin_actions` with the correct `action_type`, `target_type`, `target_id`, and `admin_id`.

**Validates: Requirements 6.8**

---

## Error Handling

### Auth errors
| Condition | HTTP | Message |
|---|---|---|
| Missing fields (signup) | 400 | "All fields are required: studentId, fullName, program" |
| Invalid studentId format | 400 | "Student ID must be exactly 7 numeric digits" |
| Duplicate studentId | 409 | "Student ID already registered" |
| Missing fields (signin) | 400 | "Full name and student ID are required" |
| Credentials not found | 401 | "Invalid credentials" |
| No Authorization header | 401 | "Access denied. No token provided." |
| Expired JWT | 401 | "Token expired. Please sign in again." |
| Invalid JWT | 403 | "Invalid token." |

### Scanner errors
| Condition | HTTP | Message |
|---|---|---|
| Missing imageBase64 | 400 | "imageBase64 is required" |
| No JWT | 401 | (from auth middleware) |
| Bedrock ThrottlingException | 429 | "Too many scan requests. Please wait 30 seconds and try again." |
| Bedrock ValidationException | 400 | "Invalid image format. Please try a different image." |
| Bedrock non-JSON response | 200 | Fallback: `{ name: "Unknown Equipment", condition: "Fair", confidence: 0, equipmentId: null }` |
| Other Bedrock error | 502 | "AI Scanner is temporarily unavailable. Please retry." |

### Transaction errors
| Condition | HTTP | Message |
|---|---|---|
| Missing session fields | 400 | "All session fields are required." |
| Empty items array | 400 | "At least one equipment item is required." |
| txnId collision (race) | 409 | "Transaction ID conflict. Please retry." |
| DB failure | 500 | "Failed to create transaction. Please retry." |

### Frontend camera errors
- `getUserMedia` rejection → renders error overlay with message and "Retry Camera" button inside the viewfinder
- Scan API error → renders red error card with the server error message and a Retry button

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests verify specific examples, edge cases, and error conditions
- Property-based tests verify universal invariants across many generated inputs

### Property-Based Testing Library

Use **fast-check** (npm package `fast-check`) for both frontend and backend property tests. It integrates natively with Vitest via `fc.assert(fc.property(...))`.

Minimum 100 iterations per property test (fast-check default is 100; do not lower it).

Each property test must include a comment referencing the design property:
```
// Feature: lab-system-full-integration, Property N: <property_text>
```

### Backend Tests (Vitest)

Location: `backend/routes/auth.test.js`, `backend/routes/scanner.test.js`

**Auth route unit tests** (examples):
- Signup with valid data → HTTP 201, token present, DB row exists
- Signup with duplicate studentId → HTTP 409, exact message
- Signup with missing fields → HTTP 400, exact message
- Signin with valid credentials → HTTP 200, token present
- Signin with wrong credentials → HTTP 401, exact message
- Auth middleware with expired token → HTTP 401, exact message
- Auth middleware with no token → HTTP 401, exact message

**Auth route property tests**:
- Property 2: `fc.string()` filtered to non-`/^\d{7}$/` → always HTTP 400
- Property 3: `fc.subarray(['studentId','fullName','program'], {minLength:1,maxLength:2})` → always HTTP 400
- Property 5: `fc.record({fullName: fc.string(), studentId: fc.string()})` not in DB → always HTTP 401
- Property 6: missing field combinations → always HTTP 400

**Scanner route unit tests** (examples):
- Valid base64 + mocked Bedrock JSON → HTTP 200, all four fields present
- Mocked Bedrock non-JSON → HTTP 200, fallback values
- Mocked ThrottlingException → HTTP 429
- Mocked ValidationException → HTTP 400
- No JWT → HTTP 401
- No imageBase64 → HTTP 400
- Successful scan → exactly one `forge_scan_log` row inserted

**Scanner route property tests**:
- Property 7: `fc.base64String()` → response `condition` always in `['Excellent','Good','Fair','Poor']`
- Property 9: `fc.record({...})` valid inputs → `forge_scan_log` row count increases by exactly 1

**Transaction route property tests**:
- Property 14: `fc.array(fc.record({equipmentId: fc.string(), condition: fc.constantFrom(...)}), {minLength:1})` → DB row counts match
- Property 15: `fc.array(...)` of N transactions → GET returns N rows ordered by date desc

### Frontend Tests (Vitest + @testing-library/react)

Location: `frontend/src/test/`

**useQRScanner unit tests** (examples):
- `Html5QrcodeScanner` constructor called with correct config
- `scanner.clear()` called on `stopScanner()`

**useQRScanner property tests**:
- Property 10: `fc.string({minLength:1})` as equipmentId in FORGE_EQUIPMENT JSON → `onScanSuccess` called with that id
- Property 11: `fc.string({minLength:1}).filter(s => { try { JSON.parse(s); return false; } catch { return true; } })` → `onScanSuccess` called with trimmed value
- Property 12: `fc.record({})` (JSON missing type/equipmentId) → `onScanError` called with exact message
- Property 13: `fc.string().map(s => s.replace(/\S/g,''))` (whitespace-only) → `onScanError` called with exact message

**BorrowStep3 unit tests** (examples):
- Camera permission denied → error overlay rendered with "Retry Camera" button
- Successful scan → result card rendered with name and condition
- TTS enabled + successful scan → `speak()` called with equipment name and condition

### Test Configuration

`backend/vitest.config.js` and `frontend/vitest.config.js` are already present. Run tests with:
```
# Backend
cd backend && npx vitest --run

# Frontend
cd frontend && npx vitest --run
```
