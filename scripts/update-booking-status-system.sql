-- Update booking status system with new statuses
-- Drop existing enum and recreate with new values
ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
DROP TYPE IF EXISTS booking_status CASCADE;

-- Create new booking status enum with updated values
CREATE TYPE booking_status AS ENUM (
  'pending_payment',
  'pending_selection', 
  'delivered',
  'returned',
  'order_complete',
  'cancelled'
);

-- Update bookings table to use new enum
ALTER TABLE bookings ALTER COLUMN status TYPE booking_status USING 
  CASE 
    WHEN status::text = 'pending' THEN 'pending_payment'::booking_status
    WHEN status::text = 'confirmed' THEN 'pending_selection'::booking_status
    WHEN status::text = 'delivered' THEN 'delivered'::booking_status
    WHEN status::text = 'returned' THEN 'returned'::booking_status
    WHEN status::text = 'completed' THEN 'order_complete'::booking_status
    WHEN status::text = 'cancelled' THEN 'cancelled'::booking_status
    ELSE 'pending_payment'::booking_status
  END;

-- Set default value
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending_payment';

-- Update existing bookings to use new status values
UPDATE bookings SET status = 'pending_payment' WHERE status::text = 'pending';
UPDATE bookings SET status = 'pending_selection' WHERE status::text = 'confirmed';
UPDATE bookings SET status = 'order_complete' WHERE status::text = 'completed';

-- Recreate index
DROP INDEX IF EXISTS idx_bookings_status;
CREATE INDEX idx_bookings_status ON bookings(status);

-- Update any functions that reference the old enum values
-- This ensures database functions work with new status values
