-- Adding WooCommerce configuration with provided credentials
INSERT INTO integration_settings (integration_name, store_url, consumer_key, consumer_secret, is_active, created_at, updated_at)
VALUES (
  'WooCommerce',
  'https://safawala.com',
  'REDACTED_WOOCOMMERCE_CONSUMER_KEY',
  'REDACTED_WOOCOMMERCE_CONSUMER_SECRET',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (integration_name) 
DO UPDATE SET 
  store_url = EXCLUDED.store_url,
  consumer_key = EXCLUDED.consumer_key,
  consumer_secret = EXCLUDED.consumer_secret,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
