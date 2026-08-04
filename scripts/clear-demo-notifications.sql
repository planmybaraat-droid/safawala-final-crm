-- Clear all demo/test notifications from the database
DELETE FROM notifications WHERE title LIKE '%Demo%' OR title LIKE '%Test%' OR message LIKE '%demo%' OR message LIKE '%test%';

-- Reset notification sequence if needed
-- This ensures clean slate for real notifications
