// Notifications Routes
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications — fetch unread notifications for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT notification_id, type, message, is_read, created_at
       FROM forge_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.userId]
    );
    const unreadCount = result.rows.filter((n) => !n.is_read).length;
    return res.json({ notifications: result.rows, unreadCount });
  } catch (err) {
    console.error('Notifications fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE forge_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId]
    );
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

module.exports = router;
