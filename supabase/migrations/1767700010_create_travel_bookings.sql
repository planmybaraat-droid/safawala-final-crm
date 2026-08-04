-- Travel Bookings table
-- Tracks stylist travel arrangements for events (train, hotel, flight etc.)

CREATE TABLE IF NOT EXISTS travel_bookings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      uuid,                          -- links to product_orders.id
  order_number    text,                          -- denormalised for quick display
  event_date      date,
  event_name      text,
  venue           text,
  venue_city      text,
  customer_name   text,
  stylist_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  franchise_id    uuid REFERENCES franchises(id) ON DELETE CASCADE,

  -- Travel mode
  travel_mode     text DEFAULT 'train'
                  CHECK (travel_mode IN ('train','flight','bus','self_drive','cab')),

  -- Train / Flight / Bus
  ticket_ref      text,
  pnr             text,
  departure_from  text,
  arrival_at      text,
  departure_date  date,
  departure_time  text,
  return_date     date,
  return_time     text,

  -- Hotel
  hotel_name      text,
  hotel_address   text,
  hotel_checkin   date,
  hotel_checkout  date,
  hotel_ref       text,
  hotel_contact   text,

  -- Budget tracking
  ticket_cost     numeric(10,2) DEFAULT 0,
  hotel_cost      numeric(10,2) DEFAULT 0,
  other_cost      numeric(10,2) DEFAULT 0,
  advance_given   numeric(10,2) DEFAULT 0,

  -- Status flow
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','ticket_booked','hotel_booked','fully_booked','departed','returned','cancelled')),

  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index for franchise isolation and common queries
CREATE INDEX IF NOT EXISTS idx_travel_bookings_franchise ON travel_bookings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_stylist   ON travel_bookings(stylist_id);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_event     ON travel_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_booking   ON travel_bookings(booking_id);

-- RLS
ALTER TABLE travel_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franchise_travel_access" ON travel_bookings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE (franchise_id = travel_bookings.franchise_id OR role = 'super_admin')
      AND is_active = true
    )
  );

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_travel_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER travel_bookings_updated_at
  BEFORE UPDATE ON travel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_travel_bookings_updated_at();
