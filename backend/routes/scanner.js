const express = require('express');
const oracledb = require('oracledb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { getConnection } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// POST /api/scanner/identify
// Body: { imageBase64: string, mimeType: string }
router.post('/identify', verifyToken, async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const mediaType = mimeType || 'image/jpeg';

  const prompt = `You are a laboratory equipment identification assistant.
Analyze this image and identify the lab equipment shown.
Respond ONLY with a JSON object in this exact format:
{
  "name": "<equipment name>",
  "condition": "<Excellent|Good|Fair|Poor>",
  "confidence": <0-100>,
  "department": "<Chemistry|Physics|Engineering|Unknown>"
}
If you cannot identify the equipment, set name to "Unknown Equipment" and confidence to 0.`;

  let bedrockResponse = null;
  let predictedName = 'Unknown Equipment';
  let confidence = 0;
  let condition = 'Good';
  let department = 'Unknown';

  try {
    const command = new InvokeModelCommand({
      modelId:     'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept:      'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const response = await bedrock.send(command);
    const raw = JSON.parse(new TextDecoder().decode(response.body));
    bedrockResponse = raw.content[0].text;

    // Parse JSON from Bedrock response
    const jsonMatch = bedrockResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      predictedName = parsed.name || 'Unknown Equipment';
      condition     = parsed.condition || 'Good';
      confidence    = parsed.confidence || 0;
      department    = parsed.department || 'Unknown';
    }
  } catch (err) {
    console.error('Bedrock error:', err);
    // Graceful degradation — still log the scan attempt
  }

  // Try to match against known equipment in DB
  let conn;
  let matchedEquipment = null;
  try {
    conn = await getConnection();

    if (predictedName !== 'Unknown Equipment') {
      const match = await conn.execute(
        `SELECT EQUIPMENT_ID, NAME, DEPARTMENT, STATUS, S3_IMAGE_KEY
         FROM FORGE_EQUIPMENT
         WHERE UPPER(NAME) LIKE UPPER(:name)
           AND STATUS != 'DISPOSED'
           AND ROWNUM = 1`,
        { name: `%${predictedName}%` },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (match.rows.length > 0) matchedEquipment = match.rows[0];
    }

    // Log the scan
    await conn.execute(
      `INSERT INTO FORGE_SCAN_LOG
         (USER_ID, EQUIPMENT_ID, BEDROCK_RESPONSE, PREDICTED_NAME, CONFIDENCE_SCORE)
       VALUES (:userId, :equipmentId, :bedrockResponse, :predictedName, :confidence)`,
      {
        userId:          req.user.userId,
        equipmentId:     matchedEquipment ? matchedEquipment.EQUIPMENT_ID : null,
        bedrockResponse: bedrockResponse ? bedrockResponse.substring(0, 4000) : null,
        predictedName,
        confidence,
      }
    );
    await conn.commit();
  } catch (dbErr) {
    console.error('Scan log DB error:', dbErr);
    if (conn) await conn.rollback();
  } finally {
    if (conn) await conn.close();
  }

  if (predictedName === 'Unknown Equipment' || confidence < 30) {
    return res.status(422).json({ error: 'Could not identify equipment. Please try again.' });
  }

  res.json({
    name:        matchedEquipment ? matchedEquipment.NAME : predictedName,
    equipmentId: matchedEquipment ? matchedEquipment.EQUIPMENT_ID : null,
    condition,
    confidence,
    department,
    status:      matchedEquipment ? matchedEquipment.STATUS : null,
  });
});

module.exports = router;
