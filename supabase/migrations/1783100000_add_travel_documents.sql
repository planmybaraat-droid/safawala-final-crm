-- Add document uploads + simplified status options to travel_bookings,
-- for the redesigned Travels & Hotels page (documents instead of
-- check-in/check-out dates and travel-mode fields).

ALTER TABLE travel_bookings
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

ALTER TABLE travel_bookings DROP CONSTRAINT IF EXISTS travel_bookings_status_check;
ALTER TABLE travel_bookings ADD CONSTRAINT travel_bookings_status_check
  CHECK (status IN (
    'pending','ticket_booked','hotel_booked','fully_booked','departed','returned','cancelled',
    'arranged','completed'
  ));
