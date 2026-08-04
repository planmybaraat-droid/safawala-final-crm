-- =====================================================
-- STEP 7: Create Helper Functions
-- =====================================================

-- Helper function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_franchise_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_priority VARCHAR DEFAULT 'medium',
  p_entity_type VARCHAR DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL,
  p_action_label VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    franchise_id,
    type,
    title,
    message,
    priority,
    entity_type,
    entity_id,
    metadata,
    action_url,
    action_label
  ) VALUES (
    p_user_id,
    p_franchise_id,
    p_type,
    p_title,
    p_message,
    p_priority,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_action_url,
    p_action_label
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_entity_name VARCHAR,
  p_description TEXT,
  p_franchise_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_name VARCHAR;
  v_user_email VARCHAR;
BEGIN
  -- Get user details
  SELECT name, email INTO v_user_name, v_user_email
  FROM users WHERE id = p_user_id;
  
  INSERT INTO activity_logs (
    user_id,
    user_name,
    user_email,
    action,
    entity_type,
    entity_id,
    entity_name,
    description,
    changes,
    metadata,
    franchise_id
  ) VALUES (
    p_user_id,
    v_user_name,
    v_user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_description,
    p_changes,
    p_metadata,
    p_franchise_id
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = false
      AND is_archived = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 7: Helper functions created successfully!';
  RAISE NOTICE '   - create_notification()';
  RAISE NOTICE '   - log_activity()';
  RAISE NOTICE '   - get_unread_notification_count()';
  RAISE NOTICE '   - mark_notification_read()';
  RAISE NOTICE '   - mark_all_notifications_read()';
END $$;
