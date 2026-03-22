// Admin System Reports Routes
// GET /api/admin/system-reports/analytics — daily analytics per department
// GET /api/admin/system-reports/audit-log  — admin action audit trail
// Requirements: 15.8, 15.9

const express = require('express');
const router = express.Router();
const db = require('../../db/pool');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// ---------------------------------------------------------------------------
// GET /api/admin/system-reports/analytics
// Query params: department, dateFrom, dateTo
// Returns daily analytics rows from forge_analytics_daily.
// Falls back to computing live aggregates when the table is empty.
// ---------------------------------------------------------------------------
router.get('/analytics', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { department, dateFrom, dateTo } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (department) {
    conditions.push(`department = $${idx++}`);
    params.push(department);
  }
  if (dateFrom) {
    conditions.push(`report_date >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`report_date <= $${idx++}`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Try pre-aggregated table first
    const stored = await db.query(
      `SELECT
         report_date,
         department,
         total_transactions,
         total_equipment_borrowed,
         total_maintenance_reports,
         avg_session_duration
       FROM forge_analytics_daily
       ${where}
       ORDER BY report_date DESC, department ASC`,
      params
    );

    if (stored.rows.length > 0) {
      return res.json({ analytics: stored.rows });
    }

    // Live fallback: aggregate from transactions + maintenance
    const liveConditions = [];
    const liveParams = [];
    let liveIdx = 1;

    if (department) {
      liveConditions.push(`t.department = $${liveIdx++}`);
      liveParams.push(department);
    }
    if (dateFrom) {
      liveConditions.push(`t.txn_date >= $${liveIdx++}`);
      liveParams.push(dateFrom);
    }
    if (dateTo) {
      liveConditions.push(`t.txn_date <= $${liveIdx++}`);
      liveParams.push(dateTo);
    }

    const liveWhere = liveConditions.length ? `WHERE ${liveConditions.join(' AND ')}` : '';

    const live = await db.query(
      `SELECT
         t.txn_date                                    AS report_date,
         t.department,
         COUNT(DISTINCT t.txn_id)                      AS total_transactions,
         COUNT(i.item_id)                              AS total_equipment_borrowed,
         COUNT(DISTINCT m.report_id)                   AS total_maintenance_reports,
         NULL                                          AS avg_session_duration
       FROM forge_transactions t
       LEFT JOIN forge_txn_items i ON i.txn_id = t.txn_id
       LEFT JOIN forge_maintenance m
         ON m.equipment_id IN (
           SELECT equipment_id FROM forge_txn_items WHERE txn_id = t.txn_id
         )
         AND DATE(m.created_at) = t.txn_date
       ${liveWhere}
       GROUP BY t.txn_date, t.department
       ORDER BY t.txn_date DESC, t.department ASC`,
      liveParams
    );

    return res.json({ analytics: live.rows });
  } catch (err) {
    console.error('System reports analytics error:', err);
    return res.status(500).json({ error: 'Failed to load analytics data.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/system-reports/audit-log
// Query params: adminId, actionType, targetType, dateFrom, dateTo, limit, offset
// ---------------------------------------------------------------------------
router.get('/audit-log', authenticateToken, requireRole('LAB_ADMIN'), async (req, res) => {
  const { adminId, actionType, targetType, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (adminId) {
    conditions.push(`a.admin_id = $${idx++}`);
    params.push(parseInt(adminId, 10));
  }
  if (actionType) {
    conditions.push(`a.action_type ILIKE $${idx++}`);
    params.push(`%${actionType}%`);
  }
  if (targetType) {
    conditions.push(`a.target_type = $${idx++}`);
    params.push(targetType);
  }
  if (dateFrom) {
    conditions.push(`a.created_at >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`a.created_at <= $${idx++}`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Clamp pagination
  const safeLimit  = Math.min(Math.max(parseInt(limit,  10) || 50,  1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  params.push(safeLimit, safeOffset);

  try {
    const result = await db.query(
      `SELECT
         a.action_id,
         a.admin_id,
         u.username    AS admin_username,
         u.full_name   AS admin_full_name,
         a.action_type,
         a.target_type,
         a.target_id,
         a.details,
         a.created_at
       FROM forge_admin_actions a
       JOIN forge_users u ON u.user_id = a.admin_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    // Total count for pagination
    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM forge_admin_actions a
       JOIN forge_users u ON u.user_id = a.admin_id
       ${where}`,
      countParams
    );

    return res.json({
      auditLog: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit: safeLimit,
      offset: safeOffset,
    });
  } catch (err) {
    console.error('Audit log error:', err);
    return res.status(500).json({ error: 'Failed to load audit log.' });
  }
});

module.exports = router;
