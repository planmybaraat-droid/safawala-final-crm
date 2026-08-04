-- =====================================================
-- STEP 2: Create notification preferences table
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  
  -- Category preferences (user can disable specific types)
  preferences JSONB DEFAULT '{
    "bookings": true,
    "customers": true,
    "payments": true,
    "inventory": true,
    "deliveries": true,
    "tasks": true,
    "system": true
  }'::jsonb,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 2: Notification preferences table created successfully!';
END $$;
