-- Add 'confirmed' status to the booking_status enum after pending_selection
ALTER TYPE booking_status ADD VALUE 'confirmed' AFTER 'pending_selection';

-- Update any existing bookings that might need the confirmed status
-- This is optional - you can manually update specific bookings as needed
UPDATE bookings 
SET status = 'confirmed' 
WHERE status = 'pending' AND booking_status = 'confirmed';

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_confirmed ON bookings(status) WHERE status = 'confirmed';
