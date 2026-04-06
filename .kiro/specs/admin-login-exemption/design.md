# Admin Login Exemption Bugfix Design

## Overview

The `validate()` function in `SignIn.jsx` applies a TIP email regex (`/^m[a-zA-Z.]+@tip\.edu\.ph$/`) to all users unconditionally. The admin account is seeded with `tip_email='admin'` and `student_id='ADMIN01'`, neither of which satisfies the regex or the 7-8 digit student ID check. The fix is a targeted frontend-only change: when `studentId` is `ADMIN01` (case-insensitive), skip both the email format check and the numeric student ID check, allowing the admin credentials to reach the backend unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `studentId` is `ADMIN01` (case-insensitive), causing the regex checks to incorrectly reject valid admin credentials
- **Property (P)**: The desired behavior when the bug condition holds — `validate()` returns `true` and the sign-in request is submitted to the backend
- **Preservation**: All existing validation behavior for regular students (7-8 digit numeric IDs, TIP email format) must remain unchanged
- **validate()**: The function in `frontend/src/pages/SignIn.jsx` that checks `tipEmail` and `studentId` before form submission
- **isAdmin**: The derived boolean `studentId.trim().toUpperCase() === 'ADMIN01'` used to gate the exemption logic

## Bug Details

### Bug Condition

The bug manifests when a user enters `ADMIN01` (any casing) as the Student ID. The `validate()` function applies the TIP email regex and the 7-8 digit numeric check unconditionally, so the admin's credentials (`tip_email='admin'`, `student_id='ADMIN01'`) are rejected before the request ever reaches the backend.

There is a partial workaround in `handleChange` that allows non-numeric characters when the value is `ADMIN01`, but `validate()` still rejects the result with "Must be 7-8 digits".

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { tipEmail: string, studentId: string }
  OUTPUT: boolean

  RETURN input.studentId.trim().toUpperCase() === 'ADMIN01'
         AND input.tipEmail.trim() !== ''
         AND validate(input) returns false
END FUNCTION
```

### Examples

- `studentId='ADMIN01'`, `tipEmail='admin'` → validate() returns false ("Must be a valid TIP email" + "Must be 7-8 digits") — **should pass**
- `studentId='admin01'`, `tipEmail='admin'` → same rejection due to case-insensitive match — **should pass**
- `studentId='ADMIN01'`, `tipEmail=''` → validate() returns false ("TIP Email is required") — **correct, should remain rejected**
- `studentId='2024001'`, `tipEmail='mjdelacruz@tip.edu.ph'` → validate() returns true — **correct, must stay unchanged**

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Regular students with 7-8 digit numeric IDs must continue to have TIP email format enforced
- Empty `tipEmail` for any user must continue to show "TIP Email is required"
- Empty `studentId` for any user must continue to show "Student ID is required"
- Regular students with valid credentials must continue to authenticate successfully

**Scope:**
All inputs where `studentId` is NOT `ADMIN01` (case-insensitive) are completely unaffected by this fix. This includes:
- Any numeric student ID (7-8 digits)
- Any non-ADMIN01 alphanumeric student ID
- Empty student ID inputs

## Hypothesized Root Cause

1. **Unconditional regex application**: `validate()` applies `/^m[a-zA-Z.]+@tip\.edu\.ph$/` to `tipEmail` for every user with no admin exemption path

2. **Unconditional numeric ID check**: `validate()` applies `/^\d{7,8}$/` to `studentId` for every user, rejecting `ADMIN01` as non-numeric

3. **Incomplete `handleChange` workaround**: `handleChange` already has an `ADMIN01` check to allow non-numeric characters, but `validate()` was never updated to match — the fix was half-applied

4. **No admin identity concept in validation**: The validation layer has no notion of an admin user; the exemption must be derived from the `studentId` value itself since no other signal is available at validation time

## Correctness Properties

Property 1: Bug Condition - Admin Credentials Pass Validation

_For any_ input where `studentId` is `ADMIN01` (case-insensitive) and `tipEmail` is non-empty, the fixed `validate()` function SHALL return `true`, allowing the sign-in request to be submitted to the backend without any email format or student ID format errors.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Regular Student Validation Unchanged

_For any_ input where `studentId` is NOT `ADMIN01` (case-insensitive), the fixed `validate()` function SHALL produce exactly the same result as the original `validate()` function, preserving all TIP email format enforcement and numeric student ID checks for regular students.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `frontend/src/pages/SignIn.jsx`

**Function**: `validate()`

**Specific Changes**:

1. **Derive admin flag**: At the top of `validate()`, compute `const isAdmin = formData.studentId.trim().toUpperCase() === 'ADMIN01'`

2. **Exempt email format check**: Wrap the regex check in `if (!isAdmin)` so it only runs for non-admin users; the empty-check still runs for all users

3. **Exempt numeric ID check**: Wrap the `/^\d{7,8}$/` check in `if (!isAdmin)` so it only runs for non-admin users; the empty-check still runs for all users

The resulting logic reads:
```
FUNCTION validate()
  isAdmin = studentId.trim().toUpperCase() === 'ADMIN01'

  IF tipEmail is empty THEN error: "TIP Email is required"
  ELSE IF NOT isAdmin AND tipEmail does not match TIP regex THEN error: "Must be a valid TIP email"

  IF studentId is empty THEN error: "Student ID is required"
  ELSE IF NOT isAdmin AND studentId does not match /^\d{7,8}$/ THEN error: "Must be 7-8 digits"

  RETURN no errors
END FUNCTION
```

No changes are needed to `handleChange`, `handleSubmit`, the backend, or the database.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Call `validate()` directly (or render `SignIn` and submit the form) with admin credentials and assert that no validation errors are produced. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Exact admin credentials**: `studentId='ADMIN01'`, `tipEmail='admin'` → expect `validate()` returns `true` (will fail on unfixed code)
2. **Lowercase admin ID**: `studentId='admin01'`, `tipEmail='admin'` → expect `validate()` returns `true` (will fail on unfixed code)
3. **Mixed-case admin ID**: `studentId='Admin01'`, `tipEmail='admin'` → expect `validate()` returns `true` (will fail on unfixed code)
4. **Admin with non-TIP email variant**: `studentId='ADMIN01'`, `tipEmail='administrator'` → expect `validate()` returns `true` (will fail on unfixed code)

**Expected Counterexamples**:
- `validate()` returns `false` with errors `{ tipEmail: 'Must be a valid TIP email', studentId: 'Must be 7-8 digits' }`
- Confirms root cause: both regex checks apply unconditionally

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validate_fixed(input)
  ASSERT result === true  // no validation errors
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validate_original(input) === validate_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-admin inputs

**Test Plan**: Observe behavior on UNFIXED code first for regular student inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid student credentials preserved**: `studentId='2024001'`, `tipEmail='mjdelacruz@tip.edu.ph'` → validate returns `true` before and after fix
2. **Invalid email still rejected**: `studentId='2024001'`, `tipEmail='notanemail'` → validate returns `false` with email error before and after fix
3. **Invalid numeric ID still rejected**: `studentId='123'`, `tipEmail='mjdelacruz@tip.edu.ph'` → validate returns `false` with ID error before and after fix
4. **Empty fields still rejected**: empty `tipEmail` or `studentId` → validate returns `false` with required-field errors before and after fix

### Unit Tests

- Test `validate()` with exact admin credentials (`ADMIN01` / `admin`) — expect no errors
- Test `validate()` with case variants of `ADMIN01` — expect no errors
- Test `validate()` with empty `tipEmail` when `studentId='ADMIN01'` — expect "TIP Email is required"
- Test `validate()` with empty `studentId` — expect "Student ID is required"
- Test `validate()` with valid regular student credentials — expect no errors

### Property-Based Tests

- Generate random non-ADMIN01 student IDs and verify email format is still enforced
- Generate random non-ADMIN01 student IDs and verify numeric ID format is still enforced
- Generate random case variants of `ADMIN01` with non-empty `tipEmail` and verify all pass validation

### Integration Tests

- Render `<SignIn />`, enter admin credentials, submit — verify no validation errors appear and `signIn()` is called
- Render `<SignIn />`, enter regular student credentials, submit — verify `signIn()` is called with correct values
- Render `<SignIn />`, enter invalid regular student credentials, submit — verify error messages appear and `signIn()` is not called
