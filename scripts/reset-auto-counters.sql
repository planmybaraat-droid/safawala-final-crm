-- Reset all auto-incrementing counters for clean testing
-- Reset booking numbers
UPDATE system_settings SET setting_value = '1' WHERE setting_key = 'next_booking_number';

-- Reset quote numbers  
UPDATE system_settings SET setting_value = '1' WHERE setting_key = 'next_quote_number';

-- Reset invoice numbers
UPDATE system_settings SET setting_value = '1' WHERE setting_key = 'next_invoice_number';

-- Reset purchase numbers
UPDATE system_settings SET setting_value = '1' WHERE setting_key = 'next_purchase_number';

-- Insert default settings if they don't exist
INSERT INTO system_settings (id, setting_key, setting_value, setting_type, category, description, is_public, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'next_booking_number', '1', 'integer', 'counters', 'Next booking number', false, NOW(), NOW()),
  (gen_random_uuid(), 'next_quote_number', '1', 'integer', 'counters', 'Next quote number', false, NOW(), NOW()),
  (gen_random_uuid(), 'next_invoice_number', '1', 'integer', 'counters', 'Next invoice number', false, NOW(), NOW()),
  (gen_random_uuid(), 'next_purchase_number', '1', 'integer', 'counters', 'Next purchase number', false, NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();
