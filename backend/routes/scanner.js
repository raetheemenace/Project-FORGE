// Scanner Routes — POST /api/scanner/identify
// Invokes AWS Bedrock Claude 3 with a base64 image and stores the scan in forge_scan_log
const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

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

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const prompt = `You are a laboratory equipment identification assistant.
Analyze the image and identify the lab equipment shown.
Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "name": "<equipment name>",
  "condition": "<Excellent|Good|Fair|Poor>",
  "confidence": <0-100 number>,
  "equipmentId": "<EQ-XXXX or null if unknown>"
}
If you cannot identify any lab equipment, set name to "Unknown Equipment", condition to "Fair", confidence to 0, and equipmentId to null.`;

  const bedrockInput = {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
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

    try {
      parsed = JSON.parse(text);
    } catch {
      // Bedrock returned non-JSON — treat as unidentified
      parsed = { name: 'Unknown Equipment', condition: 'Fair', confidence: 0, equipmentId: null };
    }
  } catch (bedrockErr) {
    console.error('Bedrock error:', bedrockErr);
    // Log the failed attempt then return 502
    await logScan({ userId, bedrockResponse: String(bedrockErr), predictedName: null, confidenceScore: 0, equipmentId: null });
    return res.status(502).json({ error: 'AI Scanner is temporarily unavailable. Please retry.' });
  }

  // Resolve equipment_id from DB if Bedrock returned one
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

  // Store scan in forge_scan_log (req 6.6)
  await logScan({
    userId,
    bedrockResponse: JSON.stringify(bedrockRaw),
    predictedName: parsed.name,
    confidenceScore: parsed.confidence ?? 0,
    equipmentId: resolvedEquipmentId,
  });

  res.json({
    equipmentId: resolvedEquipmentId,
    name: parsed.name,
    condition: parsed.condition,
    confidence: parsed.confidence ?? 0,
  });
});

async function logScan({ userId, bedrockResponse, predictedName, confidenceScore, equipmentId }) {
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
