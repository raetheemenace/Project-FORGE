# System-Wide Fixes Bugfix Design

## Overview

This document formalizes the bug conditions and fix strategy for a batch of issues across the FORGE Lab Equipment Management System. The bugs span five areas:

1. **TTS Voice Overlap** — concurrent audio clips play simultaneously in `useTTS.js`
2. **Report Maintenance Card on User Dashboard** — non-admin users see a card they should not
3. **Borrowing Flow — Missing Condition Fields & Bulk Restriction** — `BorrowStep3.jsx` lacks per-item condition prompts on scan; manual entry allows qty > 1
4. **AI Assistant — No Image Support** — `AIAssistant.jsx` / `backend/routes/ai.js` return text only
5. **Request Equipment — Multiple UX Gaps** — `RequestAcquisition.jsx` lacks department-first flow, equipment sidebar, limit enforcement, bulk restriction, correct status labels, and post-approval instructions

The fix strategy is targeted and minimal: each bug is addressed in the specific file and function responsible, with no changes to unrelated code paths.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs or states that trigger a defect
- **Property (P)**: The desired correct behavior when C holds
- **Preservation**: Existing correct behaviors that must remain unchanged after the fix
- **`useTTS`**: The hook in `frontend/src/hooks/useTTS.js` that manages TTS state and the `speak()` function
- **`audioRef`**: The `useRef` inside `useTTS` that holds the currently playing `Audio` object
- **`BorrowStep3`**: `frontend/src/pages/borrow/BorrowStep3.jsx` — the AI/QR scanner step of the borrow flow
- **`RequestAcquisition`**: `frontend/src/pages/RequestAcquisition.jsx` — the equipment request page
- **`AIAssistant`**: `frontend/src/components/AIAssistant.jsx` — the floating chat widget
- **`ai.js`**: `backend/routes/ai.js` — the Bedrock/Claude backend route
- **`Dashboard`**: `frontend/src/pages/Dashboard.jsx` — the user-facing dashboard
- **`quickActions`**: The array in `Dashboard.jsx` that drives the four navigation cards

---

## Bug Details

### Bug 1 — TTS Voice Overlap

#### Bug Condition

The bug manifests when `speak()` is called while a previous Polly audio clip is still playing. The existing `audioRef.current` check only pauses the audio object but a new `speak()` call can be triggered before the `onended` callback fires, resulting in two clips playing simultaneously.

**Formal Specification:**
```
FUNCTION isBugCondition_TTS(state)
  INPUT: state = { audioRef.current, ttsEnabled, newSpeakCall }
  OUTPUT: boolean

  RETURN ttsEnabled = true
         AND audioRef.current IS NOT NULL
         AND audioRef.current.paused = false
         AND newSpeakCall IS TRIGGERED
END FUNCTION
```

**Examples:**
- User toggles TTS on → dashboard summary starts playing → user navigates to BorrowStep3 → step instructions begin playing → both clips overlap
- User asks AI assistant a question → answer starts reading → user asks another question immediately → two answers play at once

---

### Bug 2 — Report Maintenance Card on User Dashboard

#### Bug Condition

The `quickActions` array in `Dashboard.jsx` always includes the "Report Maintenance" card regardless of the user's role. There is no role check before rendering the card.

**Formal Specification:**
```
FUNCTION isBugCondition_ReportCard(user)
  INPUT: user = { role }
  OUTPUT: boolean

  RETURN user.role NOT IN ['admin', 'superadmin']
         AND 'Report Maintenance' IN renderedDashboardCards
END FUNCTION
```

**Examples:**
- A student logs in → Dashboard shows "Borrow an Item", "My Transactions", "Report Maintenance", "Request Equipment" → "Report Maintenance" should not appear for students

---

### Bug 3 — Borrowing Flow: Missing Condition Fields on Scan & Bulk Entry

#### Bug Condition

**3a — No condition prompt on AI/QR scan:** When `handleAddToCart()` or `handleQRSuccess()` is called, the item is added directly to `cartItems` with a hardcoded `condition: 'Good'` and no per-item condition/notes prompt is shown.

**3b — Bulk entry allowed:** The manual entry panel accepts `manualQty > 1` and calls `Array.from({ length: qty }, ...)` to add multiple copies.

**Formal Specification:**
```
FUNCTION isBugCondition_BorrowStep3(action)
  INPUT: action = { type, qty, conditionPromptShown }
  OUTPUT: boolean

  RETURN (action.type IN ['AI_SCAN_ADD', 'QR_SCAN_ADD']
          AND action.conditionPromptShown = false)
         OR (action.type = 'MANUAL_ADD'
             AND action.qty > 1)
END FUNCTION
```

**Examples:**
- User scans equipment via AI → clicks "Add to Cart" → item added with `condition: 'Good'` and no prompt → condition not recorded accurately
- User manually enters "Oscilloscope", qty=3 → 3 identical items added in one action → bulk order should be blocked

---

### Bug 4 — AI Assistant: No Image Support

#### Bug Condition

The `handleAsk()` function in `AIAssistant.jsx` sends only `{ question }` to `POST /api/ai/chat`. The backend route accepts only a `question` string and constructs a text-only message array for Bedrock. No image retrieval or embedding logic exists.

**Formal Specification:**
```
FUNCTION isBugCondition_AIImage(question)
  INPUT: question = string
  OUTPUT: boolean

  RETURN question MATCHES /what (is|does|looks? like)/i
         AND question REFERENCES lab equipment
         AND response.containsImage = false
END FUNCTION
```

**Examples:**
- User asks "What does a Bunsen burner look like?" → text-only answer returned → no image shown
- User asks "Show me a beaker" → text answer only

---

### Bug 5 — Request Equipment: Multiple UX Gaps

#### Bug Condition

Five distinct sub-conditions exist in `RequestAcquisition.jsx`:

**Formal Specification:**
```
FUNCTION isBugCondition_RequestEquipment(state)
  INPUT: state = { departmentSelected, items, requestHistory }
  OUTPUT: boolean

  RETURN (state.departmentSelected = false AND equipmentFieldsVisible = true)   -- 5a: no dept-first
         OR (state.departmentSelected = true AND sidebarVisible = false)         -- 5b: no sidebar
         OR (totalItems(state.items) > 10 AND submissionAccepted = true)         -- 5c: no limit
         OR (ANY item IN state.items WHERE item.quantity > 1)                    -- 5d: bulk allowed
         OR (state.requestHistory CONTAINS approved AND instructionsShown = false) -- 5e: no instructions
END FUNCTION
```

**Examples:**
- User opens page → equipment name field is immediately editable without selecting a department first
- User selects "Computer Engineering" → no sidebar listing CE equipment appears
- User adds 11 items → form submits successfully without error
- User sets quantity=5 for one item → accepted
- User's request is approved → history shows "Approved" badge but no "go to stock room" message

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When TTS is disabled, the system remains completely silent (req 3.1)
- When a user navigates away from a page, active TTS audio stops on unmount (req 3.2)
- Admin users continue to see all dashboard cards and admin controls (req 3.3)
- AI scanner in BorrowStep3 continues to identify equipment and return name, condition, confidence (req 3.4)
- QR scanner in BorrowStep3 continues to look up equipment by ID and add to cart (req 3.5)
- Valid borrowing transactions in BorrowStep4 continue to create the transaction and navigate to log-updated (req 3.6)
- Request Equipment history tab continues to display all past requests with all fields (req 3.7)
- AI assistant continues to answer general lab knowledge questions via text (req 3.8)
- BorrowStep2 date validation continues to reject past dates (req 3.9)
- Users with fewer than 10 active items can still submit valid requests (req 3.10)

**Scope:**
All inputs that do NOT match any of the five bug conditions above must be completely unaffected by these fixes.

---

## Hypothesized Root Causes

### Bug 1 — TTS Voice Overlap
The `speak()` function calls `audioRef.current.pause()` before starting a new clip, but the `ttsEnabled` closure captured at `useCallback` creation time means a stale reference can exist. More critically, the `speak()` function is `async` and the pause + new `audio.play()` sequence is not atomic — a rapid second call can reach `audio.play()` before the first audio's `onended` fires, leaving `audioRef.current` pointing to the old (paused but not nulled) object.

### Bug 2 — Report Maintenance Card
The `quickActions` array is defined unconditionally. No role check is performed before including the "Report Maintenance" entry. The `useAuth` hook exposes `user.role` but it is not consulted when building `quickActions`.

### Bug 3 — Borrowing Flow
- **3a**: `handleAddToCart()` and `handleQRSuccess()` call `setCartItems` directly without showing a condition modal/prompt first. The condition is hardcoded to `'Good'`.
- **3b**: `handleManualAdd()` uses `Array.from({ length: qty }, ...)` which intentionally creates multiple items — the quantity field was designed for bulk but the requirement now restricts it to 1.

### Bug 4 — AI Image Support
The backend `POST /api/ai/chat` route only accepts `question: string` and passes it as a plain text message to Bedrock. The Bedrock message format supports `content` arrays with image blocks, but this is never used. The frontend sends no image data and the backend has no image-fetching logic.

### Bug 5 — Request Equipment UX Gaps
- **5a/5b**: The form renders all fields unconditionally. `department` state exists but is not used as a gate for showing equipment fields or a sidebar.
- **5c**: `handleSubmit` calls `Promise.all(items.map(...))` with no pre-check on total item count.
- **5d**: The `quantity` field in each item row accepts any integer ≥ 1 with no upper bound of 1.
- **5e**: The history rendering loop shows status badges but has no conditional block for `APPROVED` status to render an instruction message.

---

## Correctness Properties

Property 1: Bug Condition — TTS Single-Voice Guarantee

_For any_ state where `isBugCondition_TTS` holds (a new `speak()` call arrives while audio is playing), the fixed `useTTS` hook SHALL cancel the in-progress audio completely before starting the new clip, ensuring at most one audio clip plays at any time.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Report Maintenance Card Hidden for Non-Admins

_For any_ user where `isBugCondition_ReportCard` holds (non-admin role), the fixed `Dashboard` SHALL NOT render the "Report Maintenance" navigation card.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Condition Prompt on Scan

_For any_ action where `isBugCondition_BorrowStep3` holds with type `AI_SCAN_ADD` or `QR_SCAN_ADD`, the fixed `BorrowStep3` SHALL present a condition selection UI before the item is committed to `cartItems`.

**Validates: Requirements 2.18**

Property 4: Bug Condition — No Bulk Manual Entry

_For any_ action where `isBugCondition_BorrowStep3` holds with type `MANUAL_ADD` and `qty > 1`, the fixed `BorrowStep3` SHALL reject the entry and display a validation error restricting quantity to 1.

**Validates: Requirements 2.19**

Property 5: Bug Condition — AI Image Response

_For any_ question where `isBugCondition_AIImage` holds (equipment appearance question), the fixed AI assistant SHALL include a relevant image or image URL in the response alongside the text answer.

**Validates: Requirements 2.5**

Property 6: Bug Condition — Request Equipment Department-First

_For any_ state where `isBugCondition_RequestEquipment` holds with sub-condition 5a (no department selected), the fixed `RequestAcquisition` SHALL keep equipment fields disabled/hidden until a department is chosen.

**Validates: Requirements 2.11, 2.12**

Property 7: Bug Condition — Request Equipment Sidebar

_For any_ state where `isBugCondition_RequestEquipment` holds with sub-condition 5b (department selected, no sidebar), the fixed `RequestAcquisition` SHALL render a sidebar listing equipment for the selected department with names and IDs.

**Validates: Requirements 2.13**

Property 8: Bug Condition — Request Equipment Limit Enforcement

_For any_ state where `isBugCondition_RequestEquipment` holds with sub-condition 5c (total items > 10), the fixed `RequestAcquisition` SHALL block submission and display a limit-exceeded error.

**Validates: Requirements 2.14**

Property 9: Bug Condition — Request Equipment No Bulk

_For any_ state where `isBugCondition_RequestEquipment` holds with sub-condition 5d (qty > 1), the fixed `RequestAcquisition` SHALL restrict the quantity field to 1 and reject higher values.

**Validates: Requirements 2.15**

Property 10: Bug Condition — Post-Approval Instructions

_For any_ state where `isBugCondition_RequestEquipment` holds with sub-condition 5e (approved request, no instructions), the fixed `RequestAcquisition` SHALL display the instruction: "Your request has been approved. Please go to the stock room and ask the staff about your approved request."

**Validates: Requirements 2.17**

Property 11: Preservation — TTS Disabled Stays Silent

_For any_ state where `ttsEnabled = false`, the fixed `useTTS` hook SHALL produce no audio output, identical to the original behavior.

**Validates: Requirements 3.1**

Property 12: Preservation — Existing Borrow Flow Unaffected

_For any_ action where `isBugCondition_BorrowStep3` does NOT hold (valid single-item add with condition already set), the fixed `BorrowStep3` SHALL produce the same cart state as the original code.

**Validates: Requirements 3.4, 3.5, 3.6**

Property 13: Preservation — AI Text Answers Unaffected

_For any_ question where `isBugCondition_AIImage` does NOT hold (non-appearance question), the fixed AI assistant SHALL return the same text answer as the original Bedrock integration.

**Validates: Requirements 3.8**

---

## Fix Implementation

### Changes Required

#### Fix 1 — TTS Voice Overlap

**File:** `frontend/src/hooks/useTTS.js`

**Function:** `speak`

**Specific Changes:**
1. Before starting a new audio clip, call `stop()` (the existing stop function) to ensure `audioRef.current` is nulled and `speechSynthesis` is cancelled
2. Move the cancel logic into a synchronous guard at the top of `speak()` so it runs before the `async` Polly request begins
3. Ensure `audioRef.current` is set to `null` immediately after `pause()`, not only in `onended`

---

#### Fix 2 — Report Maintenance Card

**File:** `frontend/src/pages/Dashboard.jsx`

**Function:** `Dashboard` (component body, `quickActions` array)

**Specific Changes:**
1. Read `user.role` from the `useAuth` hook
2. Filter the `quickActions` array to exclude the "Report Maintenance" entry when `user.role` is not `'admin'` or `'superadmin'`
3. Also remove the corresponding `motion.button` card from the grid if it is hardcoded separately

---

#### Fix 3a — Condition Prompt on Scan

**File:** `frontend/src/pages/borrow/BorrowStep3.jsx`

**Specific Changes:**
1. Add a `pendingItem` state to hold the scanned item awaiting condition confirmation
2. When `handleAddToCart()` is called (AI scan) or `handleQRSuccess()` resolves, set `pendingItem` instead of calling `setCartItems` directly
3. Render a condition-selection modal/panel when `pendingItem` is set, allowing the user to pick Excellent/Good/Fair/Poor and optionally add a note
4. Only call `setCartItems` after the user confirms the condition in the modal

---

#### Fix 3b — Bulk Entry Restriction

**File:** `frontend/src/pages/borrow/BorrowStep3.jsx`

**Function:** `handleManualAdd`

**Specific Changes:**
1. Change the quantity field `min` to `1` and add `max="1"` (or clamp in validation)
2. In `handleManualAdd`, add a validation check: if `qty > 1`, set an error `'Only 1 item per entry is allowed.'` and return early
3. Remove the `Array.from({ length: qty }, ...)` multi-item creation; always create exactly one item

---

#### Fix 4 — AI Image Support

**File:** `backend/routes/ai.js` and `frontend/src/components/AIAssistant.jsx`

**Specific Changes (backend):**
1. Add a helper `isEquipmentAppearanceQuestion(question)` that returns true when the question asks what equipment looks like
2. When the helper returns true, fetch a relevant image URL (via a curated map or a search API call) and embed it in the Bedrock response or append it to the answer string as a markdown image reference
3. Alternatively, instruct Claude via the system prompt to include a Wikimedia/public-domain image URL when answering appearance questions

**Specific Changes (frontend):**
1. In `AIAssistant.jsx`, update the message rendering to detect markdown image syntax (`![...](...)`  ) in assistant messages and render an `<img>` tag instead of plain text

---

#### Fix 5 — Request Equipment UX Gaps

**File:** `frontend/src/pages/RequestAcquisition.jsx`

**Specific Changes:**
1. **Department-first (5a):** Gate the equipment item fields behind `department !== ''`; show a "Select a department first" placeholder when no department is chosen
2. **Equipment sidebar (5b):** After department selection, fetch `/api/equipment?department=X` and render a collapsible sidebar panel listing equipment names and IDs for that department
3. **Limit enforcement (5c):** In `handleSubmit`, check `items.length > 10` before the API calls; if exceeded, set `submitError` with the limit message and return
4. **No bulk (5d):** Set `max="1"` on the quantity input and add a validation rule in `validate()` that rejects `quantity > 1`
5. **Post-approval instructions (5e):** In the history list render, when `req.status === 'APPROVED'`, render an instruction banner below the request card

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan:** Write unit and integration tests that exercise each bug condition against the current (unfixed) code and assert the defective behavior is observable.

**Test Cases:**

1. **TTS Overlap Test:** Call `speak('first')` then immediately call `speak('second')` — assert that both `audio.play()` calls are made (demonstrating overlap). Will fail on fixed code.
2. **Report Maintenance Card Test:** Render `Dashboard` with a student user — assert that "Report Maintenance" card is present in the DOM. Will fail on fixed code.
3. **Scan No Condition Prompt Test:** Trigger `handleAddToCart()` in BorrowStep3 — assert item is added to cart without any condition modal appearing. Will fail on fixed code.
4. **Bulk Manual Entry Test:** Call `handleManualAdd()` with `manualQty = 3` — assert that 3 items are added to `cartItems`. Will fail on fixed code.
5. **AI No Image Test:** POST `/api/ai/chat` with `{ question: "What does a beaker look like?" }` — assert response contains no image URL. Will fail on fixed code.
6. **Request No Dept Gate Test:** Render `RequestAcquisition` — assert equipment name input is enabled before department is selected. Will fail on fixed code.
7. **Request No Limit Test:** Submit a form with 11 items — assert the API is called 11 times without a client-side error. Will fail on fixed code.

**Expected Counterexamples:**
- Two simultaneous audio clips playing (Bug 1)
- "Report Maintenance" card visible for student role (Bug 2)
- Item added to cart with hardcoded condition and no prompt (Bug 3a)
- Three items added from a single manual entry with qty=3 (Bug 3b)
- Text-only AI response for appearance question (Bug 4)
- Equipment fields editable before department selection (Bug 5a)
- 11-item submission accepted (Bug 5c)

---

### Fix Checking

**Goal:** Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition_TTS(state) DO
  result := speak_fixed(state)
  ASSERT atMostOneAudioClipPlaying(result)
END FOR

FOR ALL user WHERE isBugCondition_ReportCard(user) DO
  rendered := Dashboard_fixed(user)
  ASSERT 'Report Maintenance' NOT IN rendered.cards
END FOR

FOR ALL action WHERE isBugCondition_BorrowStep3(action) DO
  result := BorrowStep3_fixed(action)
  IF action.type IN ['AI_SCAN_ADD', 'QR_SCAN_ADD'] THEN
    ASSERT conditionModalShown(result)
  IF action.type = 'MANUAL_ADD' AND action.qty > 1 THEN
    ASSERT validationError(result)
END FOR

FOR ALL question WHERE isBugCondition_AIImage(question) DO
  result := aiChat_fixed(question)
  ASSERT containsImageReference(result.answer)
END FOR

FOR ALL state WHERE isBugCondition_RequestEquipment(state) DO
  result := RequestAcquisition_fixed(state)
  ASSERT correctBehaviorForSubCondition(result, state)
END FOR
```

---

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition_TTS(state) DO
  ASSERT useTTS_original(state) = useTTS_fixed(state)
END FOR

FOR ALL user WHERE NOT isBugCondition_ReportCard(user) DO
  ASSERT Dashboard_original(user).cards = Dashboard_fixed(user).cards
END FOR

FOR ALL action WHERE NOT isBugCondition_BorrowStep3(action) DO
  ASSERT BorrowStep3_original(action).cartItems = BorrowStep3_fixed(action).cartItems
END FOR

FOR ALL question WHERE NOT isBugCondition_AIImage(question) DO
  ASSERT aiChat_original(question).answer = aiChat_fixed(question).answer
END FOR

FOR ALL state WHERE NOT isBugCondition_RequestEquipment(state) DO
  ASSERT RequestAcquisition_original(state) = RequestAcquisition_fixed(state)
END FOR
```

**Testing Approach:** Property-based testing is recommended for preservation checking because it generates many test cases automatically across the input domain, catches edge cases that manual unit tests might miss, and provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Cases:**
1. **TTS Disabled Preservation:** Verify `speak()` with `ttsEnabled=false` produces no audio after fix
2. **TTS Unmount Preservation:** Verify `stop()` is called on component unmount after fix
3. **Admin Dashboard Preservation:** Verify admin user still sees all 4 cards after fix
4. **Borrow Cart Preservation:** Verify single-item AI scan with condition confirmed still adds correctly
5. **AI Text Preservation:** Verify non-appearance questions still return text-only answers
6. **Request History Preservation:** Verify history tab still shows all request fields after fix
7. **Request Valid Submit Preservation:** Verify ≤10 items with qty=1 still submits successfully

---

### Unit Tests

- Test `speak()` called twice in rapid succession — second call cancels first
- Test `Dashboard` renders without "Report Maintenance" for `role='student'`
- Test `Dashboard` renders with "Report Maintenance" for `role='admin'`
- Test `handleManualAdd` with `qty=1` succeeds; `qty=2` returns validation error
- Test `handleSubmit` in `RequestAcquisition` with 11 items returns client-side error
- Test `validate()` in `RequestAcquisition` rejects `quantity > 1`
- Test history item with `status='APPROVED'` renders instruction message

### Property-Based Tests

- Generate random sequences of `speak()` calls and assert at most one audio clip is active at any time
- Generate random user roles and assert "Report Maintenance" card visibility matches role
- Generate random cart actions (scan/manual) and assert condition prompt appears for scan-type adds
- Generate random request item arrays and assert submission is blocked when total > 10
- Generate random question strings and assert text-only questions return text-only answers

### Integration Tests

- Full borrow flow: scan item → condition modal appears → confirm → item in cart with correct condition → Step 4 submits successfully
- Full request flow: select department → sidebar appears → fill form with 1 item qty=1 → submit → success
- Full request flow: approved request in history → instruction message visible
- AI assistant: ask appearance question → image rendered in chat bubble
- Dashboard: student login → 3 cards visible (no Report Maintenance); admin login → 4 cards visible
