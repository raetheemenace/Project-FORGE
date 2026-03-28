# Bugfix Requirements Document

## Introduction

The AI scanner on the borrowing page (Step 3) fails to recognize lab equipment that is registered in the `forge_equipment` database table. When a user points the camera at a piece of equipment — either a physical item or a photo of it — the scanner either returns `null` for `equipmentId` or returns an equipment name that does not match any registered record. This means the scanned item cannot be properly linked to a real equipment entry, breaking the borrowing flow.

The root cause is that the Bedrock prompt sent from `backend/routes/scanner.js` asks the AI model to guess an `EQ-XXXX` equipment ID purely from the image, without providing any catalog of registered equipment names or IDs. Because the model has no knowledge of the database contents, it cannot reliably produce a valid match.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user scans an image of lab equipment that exists in `forge_equipment` THEN the system returns `equipmentId: null` because the AI model has no knowledge of registered equipment IDs

1.2 WHEN the AI model does return an equipment name THEN the system does not attempt to match that name against the `forge_equipment` table, so the resolved `equipmentId` remains null even when a close match exists

1.3 WHEN `equipmentId` is null in the scan result THEN the system adds the item to the cart without a valid equipment ID, making it impossible to create a valid transaction item linked to a real equipment record

### Expected Behavior (Correct)

2.1 WHEN a user scans an image of lab equipment that exists in `forge_equipment` THEN the system SHALL resolve and return the correct `equipmentId` by providing the registered equipment catalog to the AI model as context

2.2 WHEN the AI model returns an equipment name THEN the system SHALL perform a fuzzy/case-insensitive name match against `forge_equipment` as a fallback to resolve the `equipmentId` when the model's direct ID guess is absent or invalid

2.3 WHEN a valid `equipmentId` is resolved (either via direct ID match or name match) THEN the system SHALL return it in the scan response so the cart item is properly linked to a registered equipment record

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the AI model cannot identify any equipment in the image THEN the system SHALL CONTINUE TO return `name: "Unknown Equipment"`, `confidence: 0`, and `equipmentId: null` without crashing

3.2 WHEN a Bedrock error occurs (throttling, validation, network) THEN the system SHALL CONTINUE TO return the appropriate HTTP error response and log the failed scan attempt

3.3 WHEN a QR code is scanned instead of using the AI camera THEN the system SHALL CONTINUE TO look up equipment by the scanned ID via `GET /api/equipment/:id` independently of the AI scanner path

3.4 WHEN the scan result is returned THEN the system SHALL CONTINUE TO log the scan attempt in `forge_scan_log` with the predicted name, confidence score, and resolved equipment ID

3.5 WHEN the condition returned by the AI is not one of `Excellent`, `Good`, `Fair`, `Poor` THEN the system SHALL CONTINUE TO default the condition to `Fair`
