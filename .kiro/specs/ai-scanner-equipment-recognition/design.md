# AI Scanner Equipment Recognition Bugfix Design

## Overview

The AI scanner route (`backend/routes/scanner.js`) sends an image to AWS Bedrock Claude 3 and asks it to guess an `EQ-XXXX` equipment ID from the image alone. Because the prompt contains no catalog of registered equipment, the model cannot reliably produce a valid ID — it either returns `null` or an ID that does not exist in `forge_equipment`.

The fix has two parts:
1. Fetch all `AVAILABLE` equipment from `forge_equipment` at request time and inject the catalog into the Bedrock prompt so the model can match against real IDs and names.
2. After receiving the model's response, add a fuzzy/case-insensitive name-match fallback query against `forge_equipment` when the model's direct ID guess is absent or invalid.

No frontend changes are required. All changes are confined to `backend/routes/scanner.js`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the Bedrock prompt is sent without any equipment catalog, causing the model to return an unresolvable `equipmentId`
- **Property (P)**: The desired behavior — when a valid equipment image is scanned, the resolved `equipmentId` SHALL be a real entry from `forge_equipment` (or `null` only when no match exists)
- **Preservation**: Existing behaviors (Bedrock error handling, QR path, scan logging, condition defaulting) that must remain unchanged by the fix
- **identifyRoute**: The `POST /api/scanner/identify` handler in `backend/routes/scanner.js` that orchestrates the Bedrock call and DB resolution
- **catalogInjection**: The step of querying `forge_equipment WHERE status = 'AVAILABLE'` and embedding the result in the Bedrock prompt before the API call
- **nameFallback**: The secondary DB query `WHERE LOWER(name) LIKE LOWER($1)` executed when the model's `equipmentId` is absent or not found in the direct-ID lookup
- **resolvedEquipmentId**: The final `equipment_id` value returned to the client — either from direct-ID match, name-fallback match, or `null`

## Bug Details

### Bug Condition

The bug manifests on every call to `POST /api/scanner/identify` where the scanned item exists in `forge_equipment`. The `identifyRoute` handler builds a Bedrock prompt that asks the model to produce an `EQ-XXXX` ID without supplying any catalog, so the model has no basis for a correct answer.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request — a POST /api/scanner/identify request with a valid imageBase64
  OUTPUT: boolean

  catalogInPrompt := bedrockPromptContainsEquipmentCatalog(request)
  nameFallbackExists := codeHasNameMatchFallback()

  RETURN NOT catalogInPrompt AND NOT nameFallbackExists
END FUNCTION
```

### Examples

- User scans an Oscilloscope Tektronix TDS2024C (EQ-1001, AVAILABLE). Model returns `{ equipmentId: "EQ-1001" }`. Direct-ID lookup succeeds — **but only by luck**; without the catalog the model frequently returns wrong or null IDs.
- User scans a Bunsen Burner (EQ-5016, AVAILABLE). Model returns `{ equipmentId: null, name: "Bunsen Burner" }`. No name-match fallback exists, so `resolvedEquipmentId` is `null` even though an exact name match is in the DB.
- User scans a Vernier Caliper (EQ-3001, AVAILABLE). Model returns `{ equipmentId: "EQ-9999" }`. Direct-ID lookup finds nothing; no fallback runs, so `resolvedEquipmentId` is `null`.
- User scans an unrecognizable object. Model returns `{ equipmentId: null, name: "Unknown Equipment", confidence: 0 }`. Expected: `resolvedEquipmentId` remains `null` — this is correct behavior and must be preserved.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When the AI model cannot identify any equipment, the system must continue to return `name: "Unknown Equipment"`, `confidence: 0`, and `equipmentId: null` without crashing
- When a Bedrock error occurs (throttling, validation, network), the system must continue to return the appropriate HTTP error response and log the failed scan attempt
- When a QR code is scanned, the system must continue to look up equipment via `GET /api/equipment/:id` independently of the AI scanner path
- When a scan result is returned, the system must continue to log the attempt in `forge_scan_log` with predicted name, confidence score, and resolved equipment ID
- When the AI returns an invalid condition string, the system must continue to default the condition to `Fair`

**Scope:**
All inputs that do NOT involve the catalog-injection or name-fallback code paths should be completely unaffected. This includes:
- Bedrock error handling branches
- QR scan route
- `forge_scan_log` insert logic
- Condition validation/defaulting logic

## Hypothesized Root Cause

Based on the bug description and code review of `backend/routes/scanner.js`:

1. **No catalog in prompt**: The `prompt` string is hardcoded with no reference to `forge_equipment`. The model is asked to produce `"equipmentId": "<EQ-XXXX or null if unknown>"` with zero context about what IDs exist, making correct guesses essentially impossible for most equipment.

2. **No name-match fallback**: After the Bedrock response is parsed, the code only runs `SELECT equipment_id FROM forge_equipment WHERE equipment_id = $1` using the model's guessed ID. If that guess is wrong or null, the function immediately sets `resolvedEquipmentId = null` with no secondary attempt using the model's `name` field.

3. **AVAILABLE filter absent**: Even if a catalog were injected, the current code does not filter by `status = 'AVAILABLE'`, which could expose unavailable equipment IDs to the model and confuse resolution.

## Correctness Properties

Property 1: Bug Condition - Catalog-Injected Prompt Resolves Valid Equipment ID

_For any_ scan request where the scanned image depicts equipment that exists in `forge_equipment` with `status = 'AVAILABLE'`, the fixed `identifyRoute` SHALL resolve and return an `equipmentId` that is a valid primary key in `forge_equipment` (i.e., the resolved ID is never a fabricated or non-existent value).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Buggy Inputs Produce Identical Behavior

_For any_ request where the bug condition does NOT hold (Bedrock errors, unidentifiable images, QR path, scan logging, condition defaulting), the fixed `identifyRoute` SHALL produce exactly the same observable behavior as the original code, preserving all existing error handling, logging, and response structure.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `backend/routes/scanner.js`

**Function**: `POST /api/scanner/identify` handler

**Specific Changes**:

1. **Fetch AVAILABLE catalog before Bedrock call**: Query `SELECT equipment_id, name, department FROM forge_equipment WHERE status = 'AVAILABLE' ORDER BY equipment_id` at the start of the handler (after input validation). Store results as `catalogRows`.

2. **Inject catalog into prompt**: Replace the hardcoded `prompt` string with a template that appends the catalog as a numbered list of `EQ-XXXX — <name> (<department>)` entries. Instruct the model to match against this list and return the exact `equipment_id` from it, or `null` if none match.

3. **Preserve direct-ID lookup**: Keep the existing `SELECT equipment_id FROM forge_equipment WHERE equipment_id = $1` check unchanged as the primary resolution step.

4. **Add name-match fallback**: After the direct-ID lookup fails (or `parsed.equipmentId` is absent), run a secondary query:
   ```sql
   SELECT equipment_id FROM forge_equipment
   WHERE status = 'AVAILABLE'
     AND LOWER(name) LIKE LOWER($1)
   LIMIT 1
   ```
   using `%${parsed.name}%` as the pattern. If a row is returned, use that `equipment_id` as `resolvedEquipmentId`.

5. **Guard catalog fetch errors**: Wrap the catalog fetch in a try/catch. If it fails, continue with an empty catalog (graceful degradation) so the route does not crash.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that mock the Bedrock client and a fake `forge_equipment` DB, then call the route handler with a known equipment image. Assert that `resolvedEquipmentId` is non-null and matches a real catalog entry. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **No catalog in prompt test**: Capture the prompt string passed to Bedrock and assert it contains at least one `EQ-XXXX` catalog entry — will fail on unfixed code
2. **Direct ID miss, name present**: Mock Bedrock returning `{ equipmentId: null, name: "Bunsen Burner" }` and assert `resolvedEquipmentId === "EQ-5016"` — will fail on unfixed code (no fallback)
3. **Wrong ID, name present**: Mock Bedrock returning `{ equipmentId: "EQ-9999", name: "Vernier Caliper Mitutoyo 500-196" }` and assert `resolvedEquipmentId === "EQ-3001"` — will fail on unfixed code
4. **Case-insensitive name match**: Mock Bedrock returning `{ equipmentId: null, name: "bunsen burner" }` and assert `resolvedEquipmentId === "EQ-5016"` — will fail on unfixed code

**Expected Counterexamples**:
- `resolvedEquipmentId` is `null` even when a matching name exists in the catalog
- Possible causes: no name-fallback query, no catalog in prompt, case-sensitive comparison

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := identifyRoute_fixed(request)
  ASSERT result.equipmentId IN forge_equipment.equipment_id
         OR result.equipmentId IS NULL  -- only when no catalog match exists
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT identifyRoute_original(request) = identifyRoute_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Bedrock error paths, unknown-equipment responses, and scan logging, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Unknown equipment preservation**: Mock Bedrock returning `{ name: "Unknown Equipment", confidence: 0, equipmentId: null }` — assert response shape and `null` equipmentId are unchanged after fix
2. **Bedrock throttle error preservation**: Mock Bedrock throwing `ThrottlingException` — assert HTTP 429 response and scan log entry are unchanged after fix
3. **Condition defaulting preservation**: Mock Bedrock returning an invalid condition string — assert condition defaults to `"Fair"` after fix
4. **Scan log preservation**: For any scan result, assert `forge_scan_log` INSERT is called with the correct fields after fix

### Unit Tests

- Test that the catalog fetch query uses `WHERE status = 'AVAILABLE'`
- Test that the prompt string contains injected catalog entries when `catalogRows` is non-empty
- Test direct-ID resolution still works when model returns a valid existing ID
- Test name-fallback resolution for exact, partial, and case-insensitive name matches
- Test that an empty catalog (DB fetch error) does not crash the route

### Property-Based Tests

- Generate random subsets of the 60+ equipment catalog and verify that for any equipment in the subset, a mock Bedrock response returning that equipment's name always resolves to a valid `equipment_id` from `forge_equipment`
- Generate random strings not matching any catalog entry and verify `resolvedEquipmentId` is always `null`
- Generate random non-buggy inputs (Bedrock errors, unknown equipment responses) and verify the response shape is identical between original and fixed code

### Integration Tests

- Full route test: POST with a mocked Bedrock response containing a catalog-matched name, assert correct `equipmentId` in response and in `forge_scan_log`
- Full route test: POST with a mocked Bedrock error, assert correct HTTP status and logged error entry
- Full route test: POST with an unrecognizable image response, assert `equipmentId: null` and `name: "Unknown Equipment"`
