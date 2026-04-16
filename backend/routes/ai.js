// AI Q&A Route — POST /api/ai/chat
// Invokes AWS Bedrock Claude 3 to answer lab-related questions with live FORGE context
const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db/pool');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const BASE_SYSTEM_PROMPT = `You are FORGE Assistant, the official AI helper for the FORGE Lab Equipment Management System at Technological Institute of the Philippines (TIP) Manila.

You help students and lab admins with any laboratory-related question, including:
- General lab knowledge: equipment usage, safety procedures, calibration, lab techniques, and step-by-step procedures for lab equipment
- Equipment borrowing procedures and policies
- Lab room availability and scheduling
- Equipment status, location, and condition
- Maintenance reporting procedures
- Transaction management (borrowing, returning, tracking)
- General lab rules and guidelines

## General Lab Knowledge
You are authorized to answer ANY laboratory-related question — not just FORGE workflow questions. If a student asks how to use a piece of equipment, what safety precautions to take, how to calibrate an instrument, or how to perform a lab technique, provide a helpful, substantive answer using your general laboratory knowledge.

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
- If the question is lab-related, answer it using general laboratory knowledge. Only deflect if the question is completely unrelated to labs or FORGE — in that case, say so briefly and suggest contacting the lab admin.`;

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

    // Fetch data with error handling for each query
    let equipResult = { rows: [] };
    let roomResult = { rows: [] };
    let bookingsResult = { rows: [] };
    let roomEquipResult = { rows: [] };

    try {
      equipResult = await db.query(
        `SELECT equipment_id, name, status, department
         FROM forge_equipment
         ORDER BY name
         LIMIT 200`
      );
    } catch (err) {
      console.error('Failed to fetch equipment for AI context:', err.message);
    }

    try {
      roomResult = await db.query(
        `SELECT room_id, room_name, department, status
         FROM forge_lab_rooms
         ORDER BY room_id`
      );
    } catch (err) {
      console.error('Failed to fetch lab rooms for AI context:', err.message);
    }

    try {
      bookingsResult = await db.query(
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
      );
    } catch (err) {
      console.error('Failed to fetch bookings for AI context:', err.message);
    }

    try {
      roomEquipResult = await db.query(`
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
      `, [today]);
    } catch (err) {
      console.error('Failed to fetch room equipment for AI context:', err.message);
    }

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
    modelId: process.env.BEDROCK_MODEL_ID || 'apac.anthropic.claude-3-haiku-20240307-v1:0',
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
    let answer = result.content[0].text;

    // Keep the default text-only path intact and only append an image for
    // appearance questions that clearly refer to lab equipment.
    if (isEquipmentAppearanceQuestion(question)) {
      const imageMatch = findEquipmentImageUrl(question);
      if (imageMatch) {
        answer = `${answer}\n\n![${imageMatch.keyword}](${imageMatch.url})`;
      }
    }

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

/**
 * Returns true when the question asks what a piece of lab equipment looks like.
 */
function isEquipmentAppearanceQuestion(question) {
  const normalizedQuestion = String(question || '').toLowerCase();
  const matchesAppearancePrompt =
    /what\s+(is|does|looks?\s+like)/i.test(normalizedQuestion) &&
    /looks?\s+like|image|picture|photo|show/i.test(normalizedQuestion);

  if (!matchesAppearancePrompt) {
    return false;
  }

  const referencesLabEquipment =
    Object.keys(EQUIPMENT_IMAGE_MAP).some((keyword) => normalizedQuestion.includes(keyword)) ||
    /\blab(?:oratory)?\s+(equipment|instrument|tool|apparatus)\b/i.test(normalizedQuestion);

  return referencesLabEquipment;
}

/**
 * Curated map of common lab equipment to public-domain Wikimedia image URLs.
 */
const EQUIPMENT_IMAGE_MAP = {
  'beaker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Beaker_%28laboratory_equipment%29.jpg/320px-Beaker_%28laboratory_equipment%29.jpg',
  'bunsen burner': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bunsen_burner.jpg/320px-Bunsen_burner.jpg',
  'oscilloscope': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Oscilloscope_Tektronix_475.jpg/320px-Oscilloscope_Tektronix_475.jpg',
  'microscope': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Optical_microscope_nikon_alphaphot%2B.jpg/320px-Optical_microscope_nikon_alphaphot%2B.jpg',
  'multimeter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Fluke87-V_Multimeter.jpg/320px-Fluke87-V_Multimeter.jpg',
  'soldering iron': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Soldering_iron_tip.jpg/320px-Soldering_iron_tip.jpg',
  'pipette': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Pipette.jpg/320px-Pipette.jpg',
  'flask': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Erlenmeyer_flask.jpg/320px-Erlenmeyer_flask.jpg',
  'erlenmeyer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Erlenmeyer_flask.jpg/320px-Erlenmeyer_flask.jpg',
  'test tube': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Test_tube_rack_with_test_tubes.jpg/320px-Test_tube_rack_with_test_tubes.jpg',
  'centrifuge': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Microcentrifuge.jpg/320px-Microcentrifuge.jpg',
  'power supply': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/ATX_PS.jpg/320px-ATX_PS.jpg',
  'breadboard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/400_points_breadboard.jpg/320px-400_points_breadboard.jpg',
  'voltmeter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Fluke87-V_Multimeter.jpg/320px-Fluke87-V_Multimeter.jpg',
  'ammeter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Fluke87-V_Multimeter.jpg/320px-Fluke87-V_Multimeter.jpg',
  'thermometer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Clinical_thermometer_38.7.jpg/320px-Clinical_thermometer_38.7.jpg',
  'graduated cylinder': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Graduated_cylinder.jpg/320px-Graduated_cylinder.jpg',
  'burette': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Burette.jpg/320px-Burette.jpg',
  'spectrophotometer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Spectrophotometer_Zurich2.jpg/320px-Spectrophotometer_Zurich2.jpg',
  'ph meter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/PH_meter.jpg/320px-PH_meter.jpg',
  'balance': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Analytical_balance.jpg/320px-Analytical_balance.jpg',
  'scale': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Analytical_balance.jpg/320px-Analytical_balance.jpg',
  'hot plate': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hot_plate_stirrer.jpg/320px-Hot_plate_stirrer.jpg',
  'stirrer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hot_plate_stirrer.jpg/320px-Hot_plate_stirrer.jpg',
  'autoclave': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Autoclave_am.jpg/320px-Autoclave_am.jpg',
  'incubator': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Incubator_laboratory.jpg/320px-Incubator_laboratory.jpg',
  'fume hood': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Fume_hood.jpg/320px-Fume_hood.jpg',
  'safety goggles': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Safety_goggles.jpg/320px-Safety_goggles.jpg',
  'lab coat': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lab_coat.jpg/320px-Lab_coat.jpg',
  'lab equipment': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Laboratory_glassware.jpg/320px-Laboratory_glassware.jpg',
};

/**
 * Find the best matching image URL for a question about lab equipment appearance.
 * Returns null if no match found.
 */
function findEquipmentImageUrl(question) {
  const q = question.toLowerCase();
  for (const [keyword, url] of Object.entries(EQUIPMENT_IMAGE_MAP)) {
    if (q.includes(keyword)) return { keyword, url };
  }
  return null;
}

module.exports = router;
module.exports.buildRoomContext = buildRoomContext;
module.exports.isEquipmentAppearanceQuestion = isEquipmentAppearanceQuestion;
module.exports.findEquipmentImageUrl = findEquipmentImageUrl;
