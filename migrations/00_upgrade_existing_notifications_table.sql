-- =====================================================
-- STEP 0: Upgrade existing notifications table
-- Run this FIRST if you already have a notifications table
-- =====================================================

-- Add missing columns to existing notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);

-- Rename 'read' column to 'is_read' for consistency
ALTER TABLE notifications 
RENAME COLUMN read TO is_read;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 0: Existing notifications table upgraded!';
  RAISE NOTICE '   - Added: entity_type, entity_id, is_archived, read_at, action_label';
  RAISE NOTICE '   - Renamed: read → is_read';
END $$;
