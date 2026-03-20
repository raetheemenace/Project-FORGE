const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/maintenance — submit a maintenance report
router.post('/', verifyToken, async (req, res) => {
  const { equipmentId, severity, description } = req.body;

  if (!equipmentId || !severity || !description) {
    return res.status(400).json({ error: 'Equipment ID, severity, and description are required' });
  }

  const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
  if (!validSeverities.includes(severity)) {
    return res.status(400).json({ error: 'Severity must be Low, Medium, High, or Critical' });
  }

  let conn;
  try {
    conn = await getConnection();

    // Verify equipment exists
    const equip = await conn.execute(
      `SELECT EQUIPMENT_ID FROM FORGE_EQUIPMENT WHERE EQUIPMENT_ID = :equipmentId`,
      { equipmentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (equip.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Insert maintenance report
    const result = await conn.execute(
      `INSERT INTO FORGE_MAINTENANCE (EQUIPMENT_ID, USER_ID, SEVERITY, DESCRIPTION)
       VALUES (:equipmentId, :userId, :severity, :description)
       RETURNING REPORT_ID INTO :reportId`,
      {
        equipmentId,
        userId:      req.user.userId,
        severity,
        description,
        reportId:    { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    const reportId = result.outBinds.reportId[0];

    // Auto-create a maintenance ticket
    await conn.execute(
      `INSERT INTO FORGE_MAINTENANCE_TICKETS (REPORT_ID, STATUS, PRIORITY)
       VALUES (:reportId, 'OPEN', :priority)`,
      { reportId, priority: severity }
    );

    // Mark equipment as MAINTENANCE if severity is High or Critical
    if (severity === 'High' || severity === 'Critical') {
      await conn.execute(
        `UPDATE FORGE_EQUIPMENT SET STATUS = 'MAINTENANCE' WHERE EQUIPMENT_ID = :equipmentId`,
        { equipmentId }
      );
    }

    await conn.commit();
    res.status(201).json({ reportId, message: 'Maintenance report submitted successfully' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Maintenance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
