# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - System-Wide Bugs (TTS Overlap, Report Card, Borrow Flow, AI Image, Request Equipment)
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope each property to the concrete failing case(s)
  - Test 1 (TTS Overlap): Call `speak('first')` then immediately call `speak('second')` — assert that two `audio.play()` calls are made simultaneously (from `isBugCondition_TTS` in design §Bug 1)
  - Test 2 (Report Card): Render `Dashboard` with `user.role = 'student'` — assert "Report Maintenance" card IS present in the DOM (from `isBugCondition_ReportCard` in design §Bug 2)
  - Test 3 (No Condition Prompt on Scan): Trigger `handleAddToCart()` in BorrowStep3 after an AI scan — assert item is added to `cartItems` without any condition modal appearing (from `isBugCondition_BorrowStep3` type `AI_SCAN_ADD` in design §Bug 3a)
  - Test 4 (Bulk Manual Entry): Call `handleManualAdd()` with `manualQty = 3` — assert that 3 items are added to `cartItems` (from `isBugCondition_BorrowStep3` type `MANUAL_ADD` qty>1 in design §Bug 3b)
  - Test 5 (AI No Image): POST `/api/ai/chat` with `{ question: "What does a beaker look like?" }` — assert response contains no image URL (from `isBugCondition_AIImage` in design §Bug 4)
  - Test 6 (No Dept Gate): Render `RequestAcquisition` — assert equipment name input is enabled/visible before department is selected (from `isBugCondition_RequestEquipment` sub-condition 5a in design §Bug 5)
  - Test 7 (No Limit): Attempt to submit a form with 11 items — assert the API is called 11 times without a client-side error (from `isBugCondition_RequestEquipment` sub-condition 5c in design §Bug 5)
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., two simultaneous audio clips, "Report Maintenance" visible for student, item added without condition prompt, 3 items from qty=3, text-only AI response, equipment fields editable before dept selection, 11-item submission accepted)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.10, 1.12, 1.16, 1.17_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Existing Correct Behaviors Across All Five Fix Areas
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `speak()` with `ttsEnabled=false` produces no audio on unfixed code
  - Observe: `stop()` is called on component unmount on unfixed code
  - Observe: Admin user (`role='admin'`) sees all 4 dashboard cards on unfixed code
  - Observe: Single-item AI scan with `condition` already set adds correctly to cart on unfixed code
  - Observe: Non-appearance AI questions return text-only answers on unfixed code
  - Observe: History tab shows all request fields (name, ID, dept, qty, urgency, reason, date) on unfixed code
  - Observe: ≤10 items with qty=1 submits successfully on unfixed code
  - Write property-based test: for all states where `NOT isBugCondition_TTS` (ttsEnabled=false), `useTTS` produces no audio (from Preservation Requirements §3.1 in design)
  - Write property-based test: for all admin users where `NOT isBugCondition_ReportCard`, Dashboard renders all 4 cards (from Preservation Requirements §3.3 in design)
  - Write property-based test: for all valid single-item scan actions where `NOT isBugCondition_BorrowStep3`, cart state is unchanged (from Preservation Requirements §3.4, 3.5 in design)
  - Write property-based test: for all non-appearance questions where `NOT isBugCondition_AIImage`, AI returns text-only answer (from Preservation Requirements §3.8 in design)
  - Write property-based test: for all request submissions with ≤10 items where `NOT isBugCondition_RequestEquipment` sub-condition 5c, submission succeeds (from Preservation Requirements §3.10 in design)
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 3. Fix Bug 1 — TTS Voice Overlap in `useTTS.js`

  - [x] 3.1 Implement the TTS overlap fix
    - In `frontend/src/hooks/useTTS.js`, update the `speak()` function
    - At the top of `speak()`, before the async Polly request begins, call the existing `stop()` function synchronously to cancel any in-progress audio and null out `audioRef.current`
    - Ensure `audioRef.current` is set to `null` immediately after `pause()`, not only in `onended`
    - This makes the cancel logic atomic and prevents two clips from playing simultaneously
    - _Bug_Condition: `isBugCondition_TTS(state)` where `ttsEnabled=true AND audioRef.current IS NOT NULL AND audioRef.current.paused=false AND newSpeakCall IS TRIGGERED`_
    - _Expected_Behavior: at most one audio clip plays at any time_
    - _Preservation: when `ttsEnabled=false`, no audio is produced; `stop()` on unmount still works_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.2 Verify bug condition exploration test now passes (TTS)
    - **Property 1: Expected Behavior** - TTS Single-Voice Guarantee
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 1) — do NOT write a new test
    - Run the TTS overlap exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms only one audio clip plays at a time)
    - _Requirements: 2.1_

  - [x] 3.3 Verify preservation tests still pass (TTS)
    - **Property 2: Preservation** - TTS Disabled Stays Silent & Unmount Stops Audio
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run TTS preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in TTS behavior)

- [x] 4. Fix Bug 2 — Report Maintenance Card on User Dashboard

  - [x] 4.1 Implement the dashboard card fix
    - In `frontend/src/pages/Dashboard.jsx`, read `user.role` from the `useAuth()` hook
    - Filter the `quickActions` array to exclude the "Report Maintenance" entry when `user.role` is not `'admin'` or `'superadmin'`
    - Also remove or conditionally render the hardcoded `motion.button` for "Report Maintenance" in the navigation cards grid using the same role check
    - _Bug_Condition: `isBugCondition_ReportCard(user)` where `user.role NOT IN ['admin','superadmin'] AND 'Report Maintenance' IN renderedDashboardCards`_
    - _Expected_Behavior: "Report Maintenance" card is absent for non-admin users_
    - _Preservation: admin users continue to see all 4 cards and admin controls_
    - _Requirements: 2.2, 3.3_

  - [x] 4.2 Verify bug condition exploration test now passes (Report Card)
    - **Property 1: Expected Behavior** - Report Maintenance Card Hidden for Non-Admins
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 2) — do NOT write a new test
    - Run the Report Card exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms "Report Maintenance" is absent for student role)
    - _Requirements: 2.2_

  - [x] 4.3 Verify preservation tests still pass (Dashboard)
    - **Property 2: Preservation** - Admin Dashboard Cards Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run dashboard preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms admin still sees all 4 cards)

- [x] 5. Fix Bug 3 — Borrowing Flow: Condition Prompt & Bulk Restriction in `BorrowStep3.jsx`

  - [x] 5.1 Implement condition prompt on AI/QR scan (Bug 3a)
    - In `frontend/src/pages/borrow/BorrowStep3.jsx`, add a `pendingItem` state to hold the scanned item awaiting condition confirmation
    - When `handleAddToCart()` is called (AI scan result) or `handleQRSuccess()` resolves, set `pendingItem` instead of calling `setCartItems` directly
    - Render a condition-selection modal/panel when `pendingItem` is set, allowing the user to pick Excellent/Good/Fair/Poor and optionally add a note
    - Only call `setCartItems` after the user confirms the condition in the modal
    - _Bug_Condition: `isBugCondition_BorrowStep3(action)` where `action.type IN ['AI_SCAN_ADD','QR_SCAN_ADD'] AND action.conditionPromptShown=false`_
    - _Expected_Behavior: condition selection UI is presented before item is committed to `cartItems`_
    - _Preservation: AI scanner continues to identify equipment and return name, condition, confidence; QR scanner continues to look up equipment by ID_
    - _Requirements: 2.18, 3.4, 3.5_

  - [x] 5.2 Implement bulk entry restriction (Bug 3b)
    - In `frontend/src/pages/borrow/BorrowStep3.jsx`, update `handleManualAdd()` to add a validation check: if `qty > 1`, set an error `'Only 1 item per entry is allowed.'` and return early
    - Add `max="1"` to the quantity input field (or clamp in validation)
    - Remove the `Array.from({ length: qty }, ...)` multi-item creation; always create exactly one item
    - _Bug_Condition: `isBugCondition_BorrowStep3(action)` where `action.type='MANUAL_ADD' AND action.qty > 1`_
    - _Expected_Behavior: validation error shown; only 1 item added per manual entry_
    - _Preservation: valid borrowing transactions in Step 4 continue to create the transaction and navigate to log-updated_
    - _Requirements: 2.19, 3.6_

  - [x] 5.3 Verify bug condition exploration tests now pass (Borrow Flow)
    - **Property 1: Expected Behavior** - Condition Prompt on Scan & No Bulk Manual Entry
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Tests 3 and 4) — do NOT write new tests
    - Run the BorrowStep3 exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms condition modal appears on scan; qty>1 is rejected)
    - _Requirements: 2.18, 2.19_

  - [x] 5.4 Verify preservation tests still pass (Borrow Flow)
    - **Property 2: Preservation** - Existing Borrow Flow Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run borrow flow preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in scan, QR, or Step 4 submission)

- [-] 6. Fix Bug 4 — AI Assistant: No Image Support

  - [x] 6.1 Implement image support in backend AI route
    - In `backend/routes/ai.js`, add a helper `isEquipmentAppearanceQuestion(question)` that returns true when the question matches `/what (is|does|looks? like)/i` and references lab equipment
    - When the helper returns true, instruct Claude via the system prompt (or a per-request message injection) to include a relevant public-domain image URL (Wikimedia Commons or similar) in the response alongside the text answer
    - Alternatively, append a curated image URL to the answer string as a markdown image reference `![equipment name](url)` after the Bedrock response
    - _Bug_Condition: `isBugCondition_AIImage(question)` where `question MATCHES /what (is|does|looks? like)/i AND question REFERENCES lab equipment AND response.containsImage=false`_
    - _Expected_Behavior: response includes a relevant image URL alongside the text answer_
    - _Preservation: non-appearance questions continue to return text-only answers via existing Bedrock/Claude integration_
    - _Requirements: 2.5, 3.8_

  - [x] 6.2 Implement image rendering in frontend AI assistant
    - In `frontend/src/components/AIAssistant.jsx`, update the assistant message rendering to detect markdown image syntax (`![...](...)`) in assistant messages
    - Render an `<img>` tag with appropriate `alt` text and constrained dimensions instead of displaying the raw markdown syntax as plain text
    - _Requirements: 2.5_

  - [x] 6.3 Verify bug condition exploration test now passes (AI Image)
    - **Property 1: Expected Behavior** - AI Image Response for Appearance Questions
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 5) — do NOT write a new test
    - Run the AI image exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms image URL is present in response for appearance questions)
    - _Requirements: 2.5_

  - [x] 6.4 Verify preservation tests still pass (AI)
    - **Property 2: Preservation** - AI Text Answers Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run AI preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms non-appearance questions still return text-only answers)

- [~] 7. Fix Bug 5 — Request Equipment UX Gaps in `RequestAcquisition.jsx`

  - [x] 7.1 Implement department-first flow (Bug 5a)
    - In `frontend/src/pages/RequestAcquisition.jsx`, gate the equipment item fields behind `department !== ''`
    - Show a "Select a department first" placeholder card when no department is chosen; keep equipment name/ID inputs disabled or hidden until a department is selected
    - Move the department selector to the top of the form, above the equipment items section
    - _Bug_Condition: `isBugCondition_RequestEquipment(state)` sub-condition 5a: `departmentSelected=false AND equipmentFieldsVisible=true`_
    - _Expected_Behavior: equipment fields are disabled/hidden until department is chosen_
    - _Requirements: 2.11, 2.12_

  - [x] 7.2 Implement equipment sidebar (Bug 5b)
    - After department selection, fetch `/api/equipment?department=X` (or the appropriate endpoint) and render a collapsible sidebar/panel listing equipment names and Equipment IDs for that department
    - _Bug_Condition: `isBugCondition_RequestEquipment(state)` sub-condition 5b: `departmentSelected=true AND sidebarVisible=false`_
    - _Expected_Behavior: sidebar lists available equipment with names and IDs for the selected department_
    - _Requirements: 2.13_

  - [x] 7.3 Implement 10-item borrowing limit enforcement (Bug 5c)
    - In `handleSubmit`, check `items.length > 10` before the API calls; if exceeded, set `submitError` with the message "You cannot request more than 10 items at a time." and return early
    - _Bug_Condition: `isBugCondition_RequestEquipment(state)` sub-condition 5c: `totalItems(state.items) > 10 AND submissionAccepted=true`_
    - _Expected_Behavior: submission is blocked and limit-exceeded error is displayed_
    - _Requirements: 2.14, 3.10_

  - [x] 7.4 Implement no-bulk restriction (Bug 5d)
    - Set `max="1"` on the quantity input in each item row
    - Add a validation rule in `validate()` that rejects `quantity > 1` with the message "Quantity must be 1 per item."
    - _Bug_Condition: `isBugCondition_RequestEquipment(state)` sub-condition 5d: `ANY item WHERE item.quantity > 1`_
    - _Expected_Behavior: quantity field is restricted to 1; higher values are rejected_
    - _Requirements: 2.15_

  - [x] 7.5 Implement post-approval instructions (Bug 5e)
    - In the history list render, when `req.status === 'APPROVED'`, render an instruction banner below the request card: "Your request has been approved. Please go to the stock room and ask the staff about your approved request."
    - _Bug_Condition: `isBugCondition_RequestEquipment(state)` sub-condition 5e: `requestHistory CONTAINS approved AND instructionsShown=false`_
    - _Expected_Behavior: instruction message is displayed for approved requests_
    - _Preservation: history tab continues to display all past requests with all fields (name, ID, dept, qty, urgency, reason, date)_
    - _Requirements: 2.17, 3.7_

  - [x] 7.6 Verify bug condition exploration tests now pass (Request Equipment)
    - **Property 1: Expected Behavior** - Request Equipment Department-First, Sidebar, Limit, No Bulk, Post-Approval
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Tests 6 and 7) — do NOT write new tests
    - Run the Request Equipment exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms dept gate, limit enforcement, and other fixes are active)
    - _Requirements: 2.11, 2.12, 2.13, 2.14, 2.15, 2.17_

  - [x] 7.7 Verify preservation tests still pass (Request Equipment)
    - **Property 2: Preservation** - Request History & Valid Submission Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run Request Equipment preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms history tab and valid ≤10-item submissions are unaffected)

- [~] 8. Checkpoint — Ensure all tests pass
  - Re-run the full test suite (both exploration and preservation tests from tasks 1 and 2)
  - Confirm all Property 1 (Bug Condition) tests now PASS after fixes
  - Confirm all Property 2 (Preservation) tests still PASS after fixes
  - Verify no regressions in the borrow flow end-to-end (Step 1 → Step 4 → log-updated)
  - Verify no regressions in the AI assistant text-only path
  - Verify no regressions in the Request Equipment history tab
  - Ask the user if any questions arise before closing the spec
