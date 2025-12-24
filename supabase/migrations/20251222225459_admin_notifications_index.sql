-- Performance index for admin notification feed queries
-- Optimizes the common query pattern: ORDER BY priority, created_at DESC
-- with filtering by acknowledged_at
-- Composite index for the admin notifications feed
CREATE INDEX IF NOT EXISTS idx_admin_notifications_feed ON admin_notifications (priority, created_at DESC, acknowledged_at);

-- Index for filtering by target user
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_user ON admin_notifications (target_user_id, created_at DESC)
WHERE
  target_user_id IS NOT NULL;
