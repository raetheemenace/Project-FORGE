-- Migration: Add notifications table
CREATE TABLE IF NOT EXISTS forge_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES forge_users(user_id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,  -- 'BORROW', 'MAINTENANCE', 'ACQUISITION', 'STATUS_UPDATE'
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON forge_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON forge_notifications(user_id, is_read);
