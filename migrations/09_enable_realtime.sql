-- =====================================================
-- STEP 9: Enable Realtime for notifications table
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Step 9: Realtime enabled for notifications table!';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 NOTIFICATION SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Go to Supabase Dashboard → Database → Replication';
  RAISE NOTICE '2. Find "notifications" table and enable replication';
  RAISE NOTICE '3. Run the notification triggers SQL file (NOTIFICATION_TRIGGERS.sql)';
  RAISE NOTICE '4. Refresh your browser (Cmd+Shift+R)';
  RAISE NOTICE '5. Test by creating a booking - you should see a notification!';
  RAISE NOTICE '';
  RAISE NOTICE '✨ All tables, indexes, policies, and functions are ready!';
END $$;
