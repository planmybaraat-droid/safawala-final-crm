# Notification System Migration Guide

## 🚀 Step-by-Step Deployment

Run these SQL files **in order** in Supabase SQL Editor:

### Step 1: Create Tables
```sql
-- Run: 01_create_notification_tables.sql
```
Creates the 3 main tables:
- `notifications` - Main notification storage
- `notification_preferences` - User preferences
- `activity_logs` - Audit trail

### Step 2: Create Indexes
```sql
-- Run: 02_create_indexes.sql
```
Creates all indexes including the problematic partial index.
This runs AFTER tables exist, so no "column does not exist" error.

### Step 3: Enable RLS
```sql
-- Run: 03_enable_rls.sql
```
Enables Row Level Security with franchise isolation.
Users can only see notifications for their franchise.

### Step 4: Create Functions
```sql
-- Run: 04_create_functions.sql
```
Creates helper functions and triggers:
- `create_notification()` - Insert notifications
- `log_activity()` - Log activities
- `mark_notification_read()` - Mark as read
- Auto-update triggers
- Enables Realtime

### Step 5: Enable Triggers (Optional)
```sql
-- Run: NOTIFICATION_TRIGGERS.sql
```
Auto-creates notifications when events happen:
- Bookings created/updated
- Payments received
- Low stock alerts
- Customer updates
- Delivery status changes
- Task assignments

## 🎯 After Migration

1. **Enable Realtime Replication**
   - Go to Supabase Dashboard
   - Database → Replication
   - Find `notifications` table
   - Toggle ON

2. **Refresh Browser**
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
   - Notification bell should appear in header

3. **Test**
   - Create a booking
   - Check notification bell
   - Verify notification appears in real-time

## ✅ Migration Checklist

- [ ] Run 01_create_notification_tables.sql
- [ ] Run 02_create_indexes.sql
- [ ] Run 03_enable_rls.sql
- [ ] Run 04_create_functions.sql
- [ ] Run NOTIFICATION_TRIGGERS.sql
- [ ] Enable Realtime in Dashboard
- [ ] Refresh browser
- [ ] Test notification system

## 🐛 Troubleshooting

**"column is_read does not exist"**
- Make sure you ran step 1 first
- Step 2 must run AFTER step 1

**"relation notifications does not exist"**
- Run migrations in order (1 → 2 → 3 → 4)

**Notifications not appearing in real-time**
- Enable Realtime in Supabase Dashboard
- Check browser console for errors
- Refresh browser (hard refresh)

**Can't see any notifications**
- Check RLS policies are created (step 3)
- Verify user has correct franchise_id
- Check browser console for auth errors
