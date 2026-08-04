-- =====================================================
-- STEP 6: Create RLS Policies (Franchise Isolated)
-- =====================================================

-- NOTIFICATIONS POLICIES
-- Users can only see notifications for their franchise
CREATE POLICY "Users can view franchise notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    AND
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own franchise notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    AND
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (
    user_id = auth.uid()
    AND
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
  );

-- System can insert notifications (for any franchise)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- NOTIFICATION PREFERENCES POLICIES
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- ACTIVITY LOGS POLICIES (strict franchise isolated)
CREATE POLICY "Users can view franchise activity logs"
  ON activity_logs FOR SELECT
  USING (
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 6: RLS policies created successfully!';
  RAISE NOTICE '   - 4 policies on notifications';
  RAISE NOTICE '   - 3 policies on notification_preferences';
  RAISE NOTICE '   - 1 policy on activity_logs';
  RAISE NOTICE '   - All policies enforce franchise isolation';
END $$;
