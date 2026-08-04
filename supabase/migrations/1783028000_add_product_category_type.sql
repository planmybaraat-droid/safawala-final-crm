-- Adds a rental/sale/both classification to product_categories so the
-- create-invoice page can hide rental-only categories (e.g. Barati Safa)
-- when the user is building a Sale invoice, and vice versa.

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'sale'
  CHECK (type IN ('rental', 'sale', 'both'));

UPDATE product_categories
SET type = 'rental'
WHERE UPPER(TRIM(name)) IN ('BARATI SAFA', 'GROOM SAFA', 'BRIDE SAFA');

CREATE INDEX IF NOT EXISTS idx_product_categories_type ON product_categories(type);
