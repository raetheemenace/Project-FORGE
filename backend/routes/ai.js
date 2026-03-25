// AI Q&A Route — POST /api/ai/chat
// Invokes AWS Bedrock Claude 3 to answer lab-related questions with live FORGE context
const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db/pool');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const BASE_SYSTEM_PROMPT = `You are FORGE Assistant, the official AI helper for the FORGE Lab Equipment Management System at Technological Institute of the Philippines (TIP) Manila.

You help students and lab admins with:
- Equipment borrowing procedures and policies
- Lab room availability and scheduling
- Equipment status, location, and condition
- Maintenance reporting procedures
- Transaction management (borrowing, returning, tracking)
- General lab rules and guidelines

## FORGE System Overview
FORGE is a digital lab equipment management platform. Students borrow equipment by scanning QR codes or using AI-powered image recognition. All transactions are tracked with unique IDs (format: TXN-YYYYMMDD-NNN).

## Borrowing Procedure (Step-by-Step)
1. Go to Dashboard → click "Borrow an Item"
2. Step 1 — Fill in borrowing details: department, course, time slot, lab room, and adviser name
3. Step 2 — Scan or identify equipment using the camera (AI image recognition) or QR code scanner. You can also search by equipment ID manually.
4. Step 3 — Review your cart and confirm the items you want to borrow
5. Step 4 — Submit the transaction. You'll receive a Transaction ID (TXN-...) and a Claim ID to present at the lab counter
6. Present your Claim ID at the lab counter to physically receive the equipment

## Returning Equipment
- Go to "My Transactions" from the Dashboard
- Find the active transaction and click "Return"
- The transaction status changes: ACTIVE → PENDING_RETURN → CLAIM_ID → RETURNED
- Present the Claim ID at the lab counter to complete the return

## Transaction Statuses
- ACTIVE: Equipment is currently borrowed
- PENDING_RETURN: Return has been initiated, waiting for lab staff confirmation
- CLAIM_ID: A claim ID has been issued — present it at the counter
- RETURNED: Transaction is complete

## Maintenance Reporting
- Go to Dashboard → "Report Maintenance"
- Scan the equipment QR code or type the Equipment ID manually
- Select severity: Low, Medium, High, or Critical
- Add a description of the issue
- Optionally attach a photo
- Submit — the report goes to lab admins for review

## Equipment IDs
- Format: EQ-XXXX (e.g., EQ-7167, EQ-0001)
- Each piece of equipment has a unique QR code
- Equipment statuses: AVAILABLE, MAINTENANCE (not available for borrowing)

## Lab Rooms
- Rooms are identified by codes like A-101, B-205
- Status: ACTIVE (available), MAINTENANCE (under repair), INACTIVE
- Room availability is shown live on the Dashboard

## Equipment Conditions (when borrowing)
- Excellent, Good, Fair, Poor — recorded per item per transaction

## Policies
- Only authenticated TIP students and staff can borrow equipment
- Equipment must be returned within the booked time slot
- Damaged or lost equipment must be reported immediately via "Report Maintenance"
- Students are responsible for equipment during their borrowing period
- Lab admins can override transactions and manage equipment lifecycle

## Voice Features
- TTS (Text-to-Speech): Toggle the speaker icon in the header to hear dashboard summaries and AI answers read aloud
- STT (Speech-to-Text): Use the microphone button in the maintenance report form to dictate descriptions

## Tips
- Use the AI scanner (camera) in the borrow flow to identify equipment automatically — just point the camera at the item
- You can add multiple items to one transaction
- Check the Dashboard for real-time equipment and room availability before heading to the lab

Always be helpful, concise, and accurate. If you don't know something specific about FORGE, say so and suggest the user contact the lab admin.`;

/**
 * Fetch live context from the database to inject into the AI prompt.
 * Returns a summary string of current equipment and room status.
 */
async function fetchLiveContext() {
  try {
    const [equipResult, roomResult] = await Promise.all([
      db.query(
        `SELECT equipment_id, name, status, department
         FROM forge_equipment
         ORDER BY name
         LIMIT 100`
      ),
      db.query(
        `SELECT room_id, room_name, department, status
         FROM forge_lab_rooms
         ORDER BY room_id`
      ),
    ]);

    const equipment = equipResult.rows;
    const rooms = roomResult.rows;

    const available = equipment.filter((e) => e.status === 'AVAILABLE');
    const maintenance = equipment.filter((e) => e.status === 'MAINTENANCE');

    const equipmentContext = [
      `## Live Equipment Status (${equipment.length} total)`,
      `Available (${available.length}): ${available.map((e) => `${e.equipment_id} — ${e.name}`).join(', ') || 'none'}`,
      `Under Maintenance (${maintenance.length}): ${maintenance.map((e) => `${e.equipment_id} — ${e.name}`).join(', ') || 'none'}`,
    ].join('\n');

    const roomContext = [
      `## Live Lab Room Status (${rooms.length} total)`,
      rooms.map((r) => `${r.room_id} (${r.room_name}, ${r.department}): ${r.status}`).join('\n'),
    ].join('\n');

    return `\n\n${equipmentContext}\n\n${roomContext}`;
  } catch (err) {
    console.error('AI context fetch error:', err);
    return ''; // degrade gracefully — answer without live data
  }
}

/**
 * POST /api/ai/chat
 * Body: { question: string }
 * Returns: { answer: string }
 */
router.post('/chat', authenticateToken, async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  // Inject live DB context so the AI can answer questions about current availability
  const liveContext = await fetchLiveContext();
  const systemPrompt = BASE_SYSTEM_PROMPT + liveContext;

  const bedrockInput = {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question.trim() }],
    }),
  };

  try {
    const command = new InvokeModelCommand(bedrockInput);
    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const answer = result.content[0].text;
    return res.json({ answer });
  } catch (err) {
    console.error('Bedrock AI chat error:', err);

    if (err.name === 'ThrottlingException') {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }
    if (err.name === 'ValidationException') {
      return res.status(400).json({ error: 'Invalid request. Please rephrase your question.' });
    }
    return res.status(502).json({ error: 'AI assistant is temporarily unavailable.' });
  }
});

module.exports = router;
