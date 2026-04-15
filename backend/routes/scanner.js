// Scanner Routes — POST /api/scanner/identify
// Invokes AWS Bedrock Claude 3 with a base64 image and stores the scan in forge_scan_log
const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Log a scan to forge_scan_log table
 */
async function logScan({ userId, bedrockResponse, predictedName, confidenceScore, equipmentId }) {
  try {
    await db.query(
      `INSERT INTO forge_scan_log (user_id, bedrock_response, predicted_name, confidence_score, equipment_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, bedrockResponse, predictedName, confidenceScore, equipmentId]
    );
  } catch (err) {
    console.error('logScan error:', err);
  }
}

/**
 * POST /api/scanner/identify
 * Body: { imageBase64: string (data URL or raw base64), mediaType?: string }
 * Returns: { equipmentId, name, condition, confidence, bedrockRaw }
 * Requirements: 6.2, 6.3, 6.6
 */
router.post('/identify', authenticateToken, async (req, res) => {
  const { imageBase64, mediaType = 'image/jpeg' } = req.body;
  const userId = req.user.userId;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  // Step 1 — Fetch AVAILABLE catalog before Bedrock call
  let catalogRows = [];
  try {
    const catalogResult = await db.query(
      'SELECT equipment_id, name, status, department FROM forge_equipment WHERE status != \'DISPOSED\' ORDER BY equipment_id'
    );
    catalogRows = catalogResult.rows;
  } catch {
    // Graceful degradation — continue without catalog if fetch fails
    catalogRows = [];
  }

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  // Step 2 — Inject catalog into prompt
  const catalogList = catalogRows.length > 0
    ? catalogRows.map((r, i) => `${i + 1}. ${r.equipment_id} — ${r.name} [${r.status}] (${r.department})`).join('\n')
    : '(no equipment registered)';

  const prompt = `You are a laboratory equipment identification assistant.
Analyze the image and identify the lab equipment shown.

Here is the list of all registered equipment in the system (including items currently under maintenance or otherwise unavailable):
${catalogList}

Match the equipment in the image against this list. Return the exact equipment_id from the list above if you find a match, or null if none match. You should identify the equipment regardless of its current availability status.
Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "name": "<equipment name>",
  "condition": "<Excellent|Good|Fair|Poor>",
  "confidence": <0-100 number>,
  "equipmentId": "<EQ-XXXX from the list above, or null if no match>"
}
If you cannot identify any lab equipment, set name to "Unknown Equipment", condition to "Fair", confidence to 0, and equipmentId to null.`;

  const bedrockInput = {
    modelId: process.env.BEDROCK_MODEL_ID || 'apac.anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  };

  let bedrockRaw = null;
  let parsed = null;

  try {
    const command = new InvokeModelCommand(bedrockInput);
    const response = await bedrock.send(command);
    bedrockRaw = JSON.parse(new TextDecoder().decode(response.body));
    const text = bedrockRaw.content?.[0]?.text ?? '';

    // Extract JSON — Bedrock sometimes wraps output in markdown code fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Bedrock returned non-JSON — treat as unidentified
      console.warn('Bedrock non-JSON response:', text);
      parsed = { name: 'Unknown Equipment', condition: 'Fair', confidence: 0, equipmentId: null };
    }
  } catch (bedrockErr) {
    console.error('Bedrock error:', bedrockErr.name, bedrockErr.message);
    
    // Handle specific AWS errors
    let errorMessage = 'AI Scanner is temporarily unavailable. Please retry.';
    let statusCode = 502;
    
    if (bedrockErr.name === 'ThrottlingException') {
      errorMessage = 'Too many scan requests. Please wait 30 seconds and try again.';
      statusCode = 429;
    } else if (bedrockErr.name === 'ValidationException') {
      errorMessage = `Invalid image or request: ${bedrockErr.message}`;
      statusCode = 400;
    } else if (bedrockErr.name === 'AccessDeniedException') {
      errorMessage = 'Bedrock model access denied. Check model access in AWS console.';
      statusCode = 403;
    } else if (bedrockErr.name === 'ResourceNotFoundException') {
      errorMessage = 'Bedrock model not found. Check BEDROCK_MODEL_ID configuration.';
      statusCode = 404;
    }
    
    // Log the failed attempt
    await logScan({ 
      userId, 
      bedrockResponse: JSON.stringify({ error: bedrockErr.message, name: bedrockErr.name }), 
      predictedName: null, 
      confidenceScore: 0, 
      equipmentId: null 
    });
    
    return res.status(statusCode).json({ error: errorMessage });
  }

  // Step 3 — Resolve equipment_id from DB if Bedrock returned one (direct-ID lookup, unchanged)
  let resolvedEquipmentId = null;
  if (parsed.equipmentId) {
    try {
      const eq = await db.query(
        'SELECT equipment_id FROM forge_equipment WHERE equipment_id = $1',
        [parsed.equipmentId]
      );
      if (eq.rows.length > 0) resolvedEquipmentId = eq.rows[0].equipment_id;
    } catch { /* non-fatal */ }
  }

  // Step 4 — Name-match fallback when direct-ID lookup failed or equipmentId was absent
  if (!resolvedEquipmentId && parsed.name && parsed.name !== 'Unknown Equipment') {
    try {
      const nameMatch = await db.query(
        `SELECT equipment_id FROM forge_equipment
         WHERE status != 'DISPOSED'
           AND LOWER(name) LIKE LOWER($1)
         LIMIT 1`,
        [`%${parsed.name}%`]
      );
      if (nameMatch.rows.length > 0) resolvedEquipmentId = nameMatch.rows[0].equipment_id;
    } catch { /* non-fatal */ }
  }

  // Store scan in forge_scan_log (req 6.6)
  await logScan({
    userId,
    bedrockResponse: JSON.stringify(bedrockRaw),
    predictedName: parsed.name,
    confidenceScore: parsed.confidence ?? 0,
    equipmentId: resolvedEquipmentId,
  });

  const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
  const condition = VALID_CONDITIONS.includes(parsed.condition) ? parsed.condition : 'Fair';

  res.json({
    equipmentId: resolvedEquipmentId,
    name: parsed.name,
    condition,
    confidence: parsed.confidence ?? 0,
  });
});

/**
 * GET /api/scanner/debug
 * Returns the current Bedrock model ID and AWS region being used.
 * Useful for verifying configuration without making a Bedrock call.
 */
router.get('/debug', authenticateToken, async (req, res) => {
  const modelId = process.env.BEDROCK_MODEL_ID || 'apac.anthropic.claude-3-haiku-20240307-v1:0';
  const region = process.env.AWS_REGION || '(not set)';

  // Try a minimal Bedrock call with a text-only message to verify connectivity
  try {
    const testInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      }),
    };
    const command = new InvokeModelCommand(testInput);
    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return res.json({
      status: 'ok',
      modelId,
      region,
      bedrockResponse: result.content?.[0]?.text ?? '(empty)',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      modelId,
      region,
      errorName: err.name,
      errorMessage: err.message,
    });
  }
});

({ userId, bedrockResponse, predictedName, confidenceScore, equipmentId }) {
  try {
    await db.query(
      `INSERT INTO forge_scan_log (user_id, equipment_id, bedrock_response, predicted_name, confidence_score)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, equipmentId, bedrockResponse, predictedName, confidenceScore]
    );
  } catch (err) {
    console.error('Failed to log scan:', err);
  }
}

module.exports = router;
