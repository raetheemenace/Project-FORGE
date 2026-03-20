const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../../db/pool');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// GET /api/admin/analytics — dashboard summary + daily rollup
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // Summary stats
    const [activeTxn, openTickets, availEquip, totalUsers] = await Promise.all([
      conn.execute(
        `SELECT COUNT(*) AS CNT FROM FORGE_TRANSACTIONS WHERE STATUS = 'ACTIVE'`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute(
        `SELECT COUNT(*) AS CNT FROM FORGE_MAINTENANCE_TICKETS WHERE STATUS IN ('OPEN','IN_PROGRESS')`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute(
        `SELECT COUNT(*) AS CNT FROM FORGE_EQUIPMENT WHERE STATUS = 'AVAILABLE'`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute(
        `SELECT COUNT(*) AS CNT FROM FORGE_USERS WHERE ROLE = 'STUDENT'`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    // Daily analytics (last 30 days)
    const daily = await conn.execute(
      `SELECT REPORT_DATE, DEPARTMENT, TOTAL_TRANSACTIONS,
              TOTAL_EQUIPMENT_BORROWED, TOTAL_MAINTENANCE_REPORTS, AVG_SESSION_DURATION
       FROM FORGE_ANALYTICS_DAILY
       WHERE REPORT_DATE >= TRUNC(SYSDATE) - 30
       ORDER BY REPORT_DATE DESC, DEPARTMENT`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Per-department live counts
    const deptStats = await conn.execute(
      `SELECT t.DEPARTMENT,
              COUNT(DISTINCT t.TXN_ID) AS ACTIVE_TRANSACTIONS,
              COUNT(i.ITEM_ID)         AS ITEMS_BORROWED
       FROM FORGE_TRANSACTIONS t
       JOIN FORGE_TXN_ITEMS i ON t.TXN_ID = i.TXN_ID
       WHERE t.STATUS = 'ACTIVE'
       GROUP BY t.DEPARTMENT`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      summary: {
        activeTransactions: activeTxn.rows[0].CNT,
        openMaintenanceTickets: openTickets.rows[0].CNT,
        availableEquipment: availEquip.rows[0].CNT,
        registeredStudents: totalUsers.rows[0].CNT,
      },
      dailyAnalytics:   daily.rows,
      departmentStats:  deptStats.rows,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// GET /api/admin/audit-log
router.get('/audit-log', verifyToken, requireAdmin, async (req, res) => {
  const { adminId, actionType, limit = 100 } = req.query;
  let conn;
  try {
    conn = await getConnection();
    const params = { limit: Number(limit) };
    let sql = `
      SELECT a.ACTION_ID, a.ACTION_TYPE, a.TARGET_TYPE, a.TARGET_ID,
             a.DETAILS, a.CREATED_AT, u.FULL_NAME AS ADMIN_NAME, u.USERNAME
      FROM FORGE_ADMIN_ACTIONS a
      JOIN FORGE_USERS u ON a.ADMIN_ID = u.USER_ID
      WHERE 1=1`;

    if (adminId)    { sql += ` AND a.ADMIN_ID = :adminId`;           params.adminId = adminId; }
    if (actionType) { sql += ` AND a.ACTION_TYPE = :actionType`;     params.actionType = actionType; }
    sql += ` ORDER BY a.CREATED_AT DESC FETCH FIRST :limit ROWS ONLY`;

    const result = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
