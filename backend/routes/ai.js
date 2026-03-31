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

## Answer Style Rules
- Be direct. Lead every answer with the key fact (Yes/No, the time, the status).
- Keep answers short — 1 to 3 sentences for simple questions.
- For availability questions, always state: (1) available or not, (2) the booked time slots if any, (3) when it becomes free.
- Never pad answers with unnecessary explanation unless the user asks for details.
- If you don't know something specific about FORGE, say so briefly and suggest contacting the lab admin.`;

/**
 * Fetch live context from the database to inject into the AI prompt.
 * Includes per-equipment time slot bookings for today so the AI can answer
 * availability questions like "is EQ-0001 free at 10:00?" directly.
 */
async function fetchLiveContext() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [equipResult, roomResult, bookingsResult, roomEquipResult] = await Promise.all([
      // All equipment with status
      db.query(
        `SELECT equipment_id, name, status, department
         FROM forge_equipment
         ORDER BY name
         LIMIT 200`
      ),
      // All lab rooms
      db.query(
        `SELECT room_id, room_name, department, status
         FROM forge_lab_rooms
         ORDER BY room_id`
      ),
      // Today's active bookings per equipment with time slots and borrower info
      db.query(
        `SELECT
           e.equipment_id,
           e.name          AS equipment_name,
           t.time_slot,
           t.txn_date,
           t.status        AS txn_status,
           u.full_name     AS borrower_name,
           t.lab_room
         FROM forge_txn_items i
         JOIN forge_equipment e ON e.equipment_id = i.equipment_id
         JOIN forge_transactions t ON t.txn_id = i.txn_id
         JOIN forge_users u ON u.user_id = t.user_id
         WHERE t.txn_date = $1
           AND t.status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID')
         ORDER BY e.equipment_id, t.time_slot`,
        [today]
      ),
      // Per-room equipment availability
      db.query(`
        SELECT
          r.room_id,
          r.room_name,
          r.department,
          r.status AS room_status,
          e.equipment_id,
          e.name AS equipment_name,
          e.status AS equipment_status,
          CASE
            WHEN t.txn_id IS NOT NULL THEN t.time_slot
            ELSE NULL
          END AS booked_slot,
          CASE
            WHEN t.txn_id IS NOT NULL THEN u.full_name
            ELSE NULL
          END AS borrower_name
        FROM forge_lab_rooms r
        LEFT JOIN forge_equipment_events ev
          ON ev.to_location = r.room_id
          AND ev.event_type IN ('PROCURED', 'TRANSFERRED')
          AND ev.event_id = (
            SELECT MAX(ev2.event_id)
            FROM forge_equipment_events ev2
            WHERE ev2.equipment_id = ev.equipment_id
              AND ev2.event_type IN ('PROCURED', 'TRANSFERRED')
          )
        LEFT JOIN forge_equipment e ON e.equipment_id = ev.equipment_id
          AND e.status != 'DISPOSED'
        LEFT JOIN forge_txn_items ti ON ti.equipment_id = e.equipment_id
        LEFT JOIN forge_transactions t
          ON t.txn_id = ti.txn_id
          AND t.txn_date = $1
          AND t.status IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID')
        LEFT JOIN forge_users u ON u.user_id = t.user_id
        ORDER BY r.room_id, e.name
      `, [today]),
    ]);

    const equipment = equipResult.rows;
    const rooms = roomResult.rows;
    const bookings = bookingsResult.rows;

    // Build a map: equipment_id → list of booked time slots today
    const bookingMap = {};
    for (const b of bookings) {
      if (!bookingMap[b.equipment_id]) bookingMap[b.equipment_id] = [];
      bookingMap[b.equipment_id].push({
        timeSlot: b.time_slot,
        borrower: b.borrower_name,
        room: b.lab_room,
        status: b.txn_status,
      });
    }

    // Build per-equipment availability lines
    const equipLines = equipment.map((e) => {
      const slots = bookingMap[e.equipment_id] || [];
      if (e.status === 'MAINTENANCE') {
        return `${e.equipment_id} — ${e.name}: UNDER MAINTENANCE (not available for borrowing)`;
      }
      if (slots.length === 0) {
        return `${e.equipment_id} — ${e.name}: AVAILABLE all day today`;
      }
      const slotList = slots.map((s) => `${s.timeSlot} (borrowed by ${s.borrower}, room ${s.room})`).join('; ');
      return `${e.equipment_id} — ${e.name}: BOOKED today during ${slotList}`;
    });

    const roomLines = rooms.map(
      (r) => `${r.room_id} (${r.room_name}, ${r.department}): ${r.status}`
    );

    const roomContext = buildRoomContext(roomEquipResult.rows);

    return `

## Current Date & Time
Today: ${today}
Current time: ${currentTime}

## Live Equipment Availability — Today (${today})
Each line shows whether the equipment is free or booked, and during which time slots.
${equipLines.join('\n')}

## Live Lab Room Status
${roomLines.join('\n')}

## Instructions for availability questions
- If asked "is [equipment] available [today / at time X]?", check the booking list above.
- If the equipment has no bookings, answer: "Yes, [name] is available all day today."
- If it has bookings, check whether the requested time overlaps. If it does NOT overlap, say it's available at that time. If it DOES overlap, say it's booked during that slot and give the free windows.
- Be direct and specific. Lead with Yes or No. Then give the time details.
- Example: "Yes, the Oscilloscope (EQ-0012) is available today. It has no bookings."
- Example: "No, the Soldering Iron (EQ-0005) is booked from 09:00–11:00 today. It's free before 09:00 and after 11:00."
${roomContext ? '\n' + roomContext : ''}`;
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

/**
 * Pure helper: build the per-room equipment availability context string.
 *
 * @param {Array} rows - Raw query result rows, each with:
 *   room_id, room_name, department, room_status,
 *   equipment_id, equipment_name, equipment_status,
 *   booked_slot, borrower_name
 * @returns {string} Formatted context section
 */
function buildRoomContext(rows) {
  const today = new Date().toISOString().slice(0, 10);

  // Group rows by room, preserving insertion order
  const roomMap = new Map();

  for (const row of rows) {
    if (!roomMap.has(row.room_id)) {
      roomMap.set(row.room_id, {
        room_id: row.room_id,
        room_name: row.room_name,
        department: row.department,
        room_status: row.room_status,
        available: [],
        booked: [],
      });
    }

    // Null equipment_id means the room has no equipment assigned
    if (!row.equipment_id) continue;

    const room = roomMap.get(row.room_id);

    if (row.booked_slot) {
      // Equipment is booked — may appear multiple times (one row per booking)
      // Avoid duplicating the same equipment in the booked list
      const existing = room.booked.find((b) => b.equipment_id === row.equipment_id);
      if (!existing) {
        room.booked.push({
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
          booked_slot: row.booked_slot,
          borrower_name: row.borrower_name,
        });
      }
    } else {
      // Equipment is available — avoid duplicates
      if (!room.available.find((a) => a.equipment_id === row.equipment_id)) {
        room.available.push({
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
        });
      }
    }
  }

  if (roomMap.size === 0) {
    return '';
  }

  const lines = [`## Live Per-Room Equipment Availability — Today (${today})`, ''];

  for (const room of roomMap.values()) {
    lines.push(`### ${room.room_id} — ${room.room_name} (${room.department}) [${room.room_status}]`);

    const availNames = room.available.map((a) => a.equipment_name);
    lines.push(`Available (${availNames.length}): ${availNames.length > 0 ? availNames.join(', ') : 'none'}`);

    if (room.booked.length === 0) {
      lines.push('Booked (0): none');
    } else {
      const bookedEntries = room.booked.map(
        (b) => `${b.equipment_name} — ${b.booked_slot} (borrowed by ${b.borrower_name})`
      );
      lines.push(`Booked (${room.booked.length}): ${bookedEntries.join(', ')}`);
    }

    lines.push('');
  }

  lines.push('## Per-Room Summary');
  for (const room of roomMap.values()) {
    const total = room.available.length + room.booked.length;
    lines.push(`${room.room_id} (${room.room_name}): ${room.available.length} available / ${total} total`);
  }

  return lines.join('\n');
}

module.exports = router;
module.exports.buildRoomContext = buildRoomContext;
