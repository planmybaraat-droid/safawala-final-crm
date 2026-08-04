-- =====================================================
-- STEP 3: Create activity logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  
  -- Action
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  
  -- Details
  description TEXT NOT NULL,
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 3: Activity logs table created successfully!';
END $$;
