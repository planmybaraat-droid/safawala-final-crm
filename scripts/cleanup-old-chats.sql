-- Creating script to delete old chat data to improve app performance
-- This script removes chat messages older than 30 days and cleans up related data
-- while preserving all CRM functionality

-- Delete old chat messages (older than 30 days)
DELETE FROM chat_messages 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete chat rooms that have no messages
DELETE FROM chat_rooms 
WHERE id NOT IN (
    SELECT DISTINCT room_id 
    FROM chat_messages 
    WHERE room_id IS NOT NULL
);

-- Clean up orphaned chat room members (members of deleted rooms)
DELETE FROM chat_room_members 
WHERE room_id NOT IN (
    SELECT id FROM chat_rooms
);

-- Update statistics
DO $$
DECLARE
    deleted_messages INTEGER;
    deleted_rooms INTEGER;
    deleted_members INTEGER;
BEGIN
    -- Get counts of remaining records
    SELECT COUNT(*) INTO deleted_messages FROM chat_messages;
    SELECT COUNT(*) INTO deleted_rooms FROM chat_rooms;
    SELECT COUNT(*) INTO deleted_members FROM chat_room_members;
    
    -- Log the cleanup results
    RAISE NOTICE 'Chat cleanup completed:';
    RAISE NOTICE 'Remaining chat messages: %', deleted_messages;
    RAISE NOTICE 'Remaining chat rooms: %', deleted_rooms;
    RAISE NOTICE 'Remaining chat room members: %', deleted_members;
END $$;

-- Vacuum tables to reclaim space
VACUUM ANALYZE chat_messages;
VACUUM ANALYZE chat_rooms;
VACUUM ANALYZE chat_room_members;
