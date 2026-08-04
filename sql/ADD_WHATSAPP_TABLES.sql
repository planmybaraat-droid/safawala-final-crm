-- WhatsApp Messages Log Table
-- Tracks all WhatsApp messages sent via WATI

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message_type text NOT NULL, -- text, template, image, document, video
  content text,
  template_name text,
  status text NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
  wati_message_id text,
  
  -- Related entities (optional)
  booking_id uuid REFERENCES package_bookings(id) ON DELETE SET NULL,
  order_id uuid REFERENCES product_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Franchise isolation
  franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Metadata
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_franchise ON whatsapp_messages(franchise_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking ON whatsapp_messages(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order ON whatsapp_messages(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id) WHERE customer_id IS NOT NULL;

-- RLS Policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their franchise
CREATE POLICY whatsapp_messages_select_policy ON whatsapp_messages
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Policy: Staff can insert messages
CREATE POLICY whatsapp_messages_insert_policy ON whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- Policy: No updates allowed (messages are immutable)
-- Policy: No deletes allowed

-- WhatsApp Notification Settings Table
CREATE TABLE IF NOT EXISTS whatsapp_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Auto-notification toggles
  booking_confirmation boolean DEFAULT true,
  payment_received boolean DEFAULT true,
  delivery_reminder boolean DEFAULT true,
  return_reminder boolean DEFAULT true,
  invoice_sent boolean DEFAULT true,
  
  -- Reminder timing (hours before event)
  delivery_reminder_hours integer DEFAULT 24,
  return_reminder_hours integer DEFAULT 24,
  
  -- Business hours (only send during these hours)
  business_hours_only boolean DEFAULT true,
  business_start_time time DEFAULT '09:00:00',
  business_end_time time DEFAULT '18:00:00',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(franchise_id)
);

-- RLS for notification settings
ALTER TABLE whatsapp_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_settings_select_policy ON whatsapp_notification_settings
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY whatsapp_settings_update_policy ON whatsapp_notification_settings
  FOR UPDATE USING (
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'franchise_admin')
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY whatsapp_settings_insert_policy ON whatsapp_notification_settings
  FOR INSERT WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'franchise_admin')
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Comments
COMMENT ON TABLE whatsapp_messages IS 'Log of all WhatsApp messages sent via WATI';
COMMENT ON TABLE whatsapp_notification_settings IS 'Per-franchise WhatsApp notification preferences';
