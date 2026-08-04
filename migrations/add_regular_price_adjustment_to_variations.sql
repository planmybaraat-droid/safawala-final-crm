-- Add regular_price_adjustment to product_variations
ALTER TABLE product_variations
  ADD COLUMN IF NOT EXISTS regular_price_adjustment DECIMAL(10,2) DEFAULT 0;
