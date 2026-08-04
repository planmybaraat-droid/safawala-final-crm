# Notification System Migrations

Run these SQL files **in order** in your Supabase SQL Editor.

## 📋 Migration Order

### Step 1: Create Tables
1. `01_create_notifications_table.sql` - Main notifications table
2. `02_create_notification_preferences_table.sql` - User preferences
3. `03_create_activity_logs_table.sql` - Audit trail

### Step 2: Add Performance
4. `04_create_indexes.sql` - All indexes including partial index

### Step 3: Enable Security
5. `05_enable_rls.sql` - Enable Row Level Security
6. `06_create_rls_policies.sql` - Franchise isolation policies

### Step 4: Add Functionality
7. `07_create_helper_functions.sql` - Utility functions
8. `08_create_triggers.sql` - Auto-update triggers
9. `09_enable_realtime.sql` - Enable realtime subscriptions

### Step 5: Auto-Notifications (Optional but Recommended)
10. Run `NOTIFICATION_TRIGGERS.sql` from the root directory

## ✅ How to Run

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste each file's content
4. Run them **one by one** in the order listed above
5. Check for success messages after each step

## 🔧 Troubleshooting

If any step fails:
- Check the error message
- Verify previous steps completed successfully
- Make sure your `users` and `franchises` tables exist
- Check that you have the necessary permissions

## 🎯 After All Migrations

1. Go to Database → Replication
2. Enable replication for `notifications` table
3. Refresh your app (Cmd+Shift+R)
4. Test by creating a booking

## 📊 What Gets Created

- **3 Tables**: notifications, notification_preferences, activity_logs
- **13 Indexes**: Optimized for fast queries
- **8 RLS Policies**: Franchise-isolated security
- **5 Functions**: Helper utilities
- **2 Triggers**: Auto-update timestamps
- **Realtime**: Live notification updates

## ✨ Features Enabled

- Real-time notifications
- Franchise isolation
- Priority system (critical, high, medium, low, info)
- Read/unread tracking
- Archive functionality
- Activity logging
- User preferences
- Deep linking to related pages
