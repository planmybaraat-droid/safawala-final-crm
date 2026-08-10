-- Lightweight, franchise-wide live feed for "someone just booked X" toasts —
-- shown on every portal, not scoped to a single department like notifications
-- rows are. Ephemeral by nature; no read/archive tracking needed.
CREATE TABLE IF NOT EXISTS booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_city TEXT,
  summary TEXT NOT NULL,
  order_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE booking_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own franchise booking activity"
  ON booking_activity FOR SELECT
  USING (franchise_id IN (SELECT franchise_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert booking activity"
  ON booking_activity FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS booking_activity_franchise_created_idx
  ON booking_activity (franchise_id, created_at DESC);
