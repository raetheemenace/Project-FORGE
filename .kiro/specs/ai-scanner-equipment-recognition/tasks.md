# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Catalog-Injected Prompt Resolves Valid Equipment ID
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — mock Bedrock returning `{ equipmentId: null, name: "Bunsen Burner" }` with `forge_equipment` containing `{ equipment_id: "EQ-5016", name: "Bunsen Burner", status: "AVAILABLE" }`, assert `resolvedEquipmentId === "EQ-5016"`
  - Add tests to `backend/routes/scanner.test.js`
  - Test case 1: Mock Bedrock returning `{ equipmentId: null, name: "Bunsen Burner" }` — assert `res._body.equipmentId === "EQ-5016"` (will fail: no name-fallback exists)
  - Test case 2: Mock Bedrock returning `{ equipmentId: "EQ-9999", name: "Vernier Caliper Mitutoyo 500-196" }` — assert `res._body.equipmentId === "EQ-3001"` (will fail: wrong ID, no fallback)
  - Test case 3: Mock Bedrock returning `{ equipmentId: null, name: "bunsen burner" }` (lowercase) — assert `res._body.equipmentId === "EQ-5016"` (will fail: no case-insensitive fallback)
  - Test case 4: Capture the prompt string passed to Bedrock and assert it contains at least one `EQ-XXXX` catalog entry (will fail: prompt has no catalog)
  - Run tests on UNFIXED code: `cd backend && npx vitest --run routes/scanner.test.js`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `resolvedEquipmentId` is `null` even when `"Bunsen Burner"` exists as `EQ-5016`)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Inputs Produce Identical Behavior
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first, observe outputs, then write tests
  - Add tests to `backend/routes/scanner.test.js`
  - Observe on UNFIXED code: `ThrottlingException` → HTTP 429 with `"Too many scan requests. Please wait 30 seconds and try again."`
  - Observe on UNFIXED code: `ValidationException` → HTTP 400 with `"Invalid image format. Please try a different image."`
  - Observe on UNFIXED code: non-JSON Bedrock response → HTTP 200, `name: "Unknown Equipment"`, `condition: "Fair"`, `confidence: 0`, `equipmentId: null`
  - Observe on UNFIXED code: invalid condition string → condition defaults to `"Fair"`
  - Observe on UNFIXED code: any successful scan → `INSERT INTO forge_scan_log` called with correct `user_id`, `predicted_name`, `confidence_score`
  - Write property-based test: for any `ThrottlingException`, response is always HTTP 429 with the throttle message (from Requirement 3.2)
  - Write property-based test: for any non-JSON Bedrock text, response always has `name: "Unknown Equipment"`, `equipmentId: null` (from Requirement 3.1)
  - Write property-based test: for any arbitrary condition string from Bedrock, response condition is always one of `Excellent|Good|Fair|Poor` (from Requirement 3.5)
  - Write property-based test: for any successful scan with any userId/name/confidence, `forge_scan_log` INSERT is called exactly once with matching fields (from Requirement 3.4)
  - Run tests on UNFIXED code: `cd backend && npx vitest --run routes/scanner.test.js`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 3. Fix for catalog-less prompt causing unresolvable equipmentId

  - [x] 3.1 Implement the fix in `backend/routes/scanner.js`
    - Step 1 — Fetch AVAILABLE catalog before Bedrock call: add `SELECT equipment_id, name, department FROM forge_equipment WHERE status = 'AVAILABLE' ORDER BY equipment_id` after input validation; store as `catalogRows`; wrap in try/catch and fall back to `[]` on error (graceful degradation)
    - Step 2 — Inject catalog into prompt: replace the hardcoded `prompt` string with a template that appends the catalog as a numbered list of `EQ-XXXX — <name> (<department>)` entries; instruct the model to match against this list and return the exact `equipment_id`, or `null` if none match
    - Step 3 — Keep existing direct-ID lookup unchanged: `SELECT equipment_id FROM forge_equipment WHERE equipment_id = $1`
    - Step 4 — Add name-match fallback after direct-ID lookup fails: run `SELECT equipment_id FROM forge_equipment WHERE status = 'AVAILABLE' AND LOWER(name) LIKE LOWER($1) LIMIT 1` using `%${parsed.name}%`; if a row is returned, use that `equipment_id` as `resolvedEquipmentId`
    - _Bug_Condition: isBugCondition(request) — bedrockPromptContainsEquipmentCatalog = false AND codeHasNameMatchFallback = false_
    - _Expected_Behavior: resolvedEquipmentId IN forge_equipment.equipment_id OR resolvedEquipmentId IS NULL (only when no catalog match exists)_
    - _Preservation: Bedrock error handling, unknown-equipment fallback, scan logging, condition defaulting, QR path all remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Catalog-Injected Prompt Resolves Valid Equipment ID
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior (name-fallback resolves `EQ-5016`, case-insensitive match works, prompt contains catalog entries)
    - Run: `cd backend && npx vitest --run routes/scanner.test.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Inputs Produce Identical Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `cd backend && npx vitest --run routes/scanner.test.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in error handling, unknown-equipment path, scan logging, condition defaulting)
    - Confirm all pre-existing tests in the file also still pass

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full backend test suite: `cd backend && npx vitest --run`
  - Confirm zero failures across all test files
  - Ensure all tests pass; ask the user if questions arise
