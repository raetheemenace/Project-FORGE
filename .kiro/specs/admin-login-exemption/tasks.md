# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Admin Credentials Rejected by validate()
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that validate() rejects ADMIN01 credentials
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases — studentId is ADMIN01 (any casing) with a non-empty tipEmail
  - Write tests in `frontend/src/test/bugConditionExploration.test.jsx`
  - Import and call `validate()` directly from `SignIn.jsx` (or render the component and inspect errors state)
  - Test case 1: `studentId='ADMIN01'`, `tipEmail='admin'` → expect validate() returns true (FAILS on unfixed code)
  - Test case 2: `studentId='admin01'`, `tipEmail='admin'` → expect validate() returns true (FAILS on unfixed code)
  - Test case 3: `studentId='Admin01'`, `tipEmail='admin'` → expect validate() returns true (FAILS on unfixed code)
  - Test case 4: `studentId='ADMIN01'`, `tipEmail='administrator'` → expect validate() returns true (FAILS on unfixed code)
  - Run tests on UNFIXED code — expected counterexample: `{ tipEmail: 'Must be a valid TIP email', studentId: 'Must be 7-8 digits' }`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found to confirm root cause: both regex checks apply unconditionally
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Regular Student Validation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Write tests in `frontend/src/test/preservationProperties.test.jsx`
  - Observe on UNFIXED code: `studentId='2024001'`, `tipEmail='mjdelacruz@tip.edu.ph'` → validate() returns true
  - Observe on UNFIXED code: `studentId='2024001'`, `tipEmail='notanemail'` → validate() returns false with email error
  - Observe on UNFIXED code: `studentId='123'`, `tipEmail='mjdelacruz@tip.edu.ph'` → validate() returns false with ID error
  - Observe on UNFIXED code: empty `tipEmail` → validate() returns false with "TIP Email is required"
  - Observe on UNFIXED code: empty `studentId` → validate() returns false with "Student ID is required"
  - Write property-based tests: for all non-ADMIN01 studentId values, TIP email format is enforced
  - Write property-based tests: for all non-ADMIN01 studentId values, 7-8 digit numeric ID format is enforced
  - Write property-based tests: empty fields always produce required-field errors regardless of admin status
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix admin login exemption in SignIn.jsx

  - [x] 3.1 Implement the fix in `frontend/src/pages/SignIn.jsx`
    - At the top of `validate()`, derive the admin flag: `const isAdmin = formData.studentId.trim().toUpperCase() === 'ADMIN01'`
    - Wrap the TIP email regex check in `if (!isAdmin)` — the empty-check still runs for all users
    - Wrap the 7-8 digit numeric ID check in `if (!isAdmin)` — the empty-check still runs for all users
    - No changes needed to `handleChange`, `handleSubmit`, the backend, or the database
    - _Bug_Condition: isBugCondition(input) where input.studentId.trim().toUpperCase() === 'ADMIN01' AND input.tipEmail.trim() !== '' AND validate(input) returns false_
    - _Expected_Behavior: validate() returns true for all inputs where studentId is ADMIN01 (case-insensitive) and tipEmail is non-empty_
    - _Preservation: All validation behavior for non-ADMIN01 studentId values must remain identical to the original validate() function_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin Credentials Pass Validation
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior (validate() returns true for ADMIN01 credentials)
    - When these tests pass, it confirms the fix is correct
    - Run bug condition exploration tests from step 1 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Regular Student Validation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions for regular students)
    - Confirm all preservation tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full frontend test suite: `cd frontend && npx vitest run`
  - Ensure all tests pass, ask the user if questions arise
