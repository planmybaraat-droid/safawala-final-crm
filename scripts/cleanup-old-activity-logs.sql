-- Creating script to clean up old activity logs that may also impact performance
-- This removes activity logs older than 90 days while keeping recent audit trail

-- Delete old activity logs (older than 90 days)
DELETE FROM activity_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old integration logs (older than 30 days)
DELETE FROM integration_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Update statistics
DO $$
DECLARE
    remaining_activity_logs INTEGER;
    remaining_integration_logs INTEGER;
BEGIN
    -- Get counts of remaining records
    SELECT COUNT(*) INTO remaining_activity_logs FROM activity_logs;
    SELECT COUNT(*) INTO remaining_integration_logs FROM integration_logs;
    
    -- Log the cleanup results
    RAISE NOTICE 'Activity logs cleanup completed:';
    RAISE NOTICE 'Remaining activity logs: %', remaining_activity_logs;
    RAISE NOTICE 'Remaining integration logs: %', remaining_integration_logs;
END $$;

-- Vacuum tables to reclaim space
VACUUM ANALYZE activity_logs;
VACUUM ANALYZE integration_logs;
