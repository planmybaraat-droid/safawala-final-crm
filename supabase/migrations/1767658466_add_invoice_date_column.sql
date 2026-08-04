-- Add invoice_date column to product_orders
-- This allows changing the invoice/quote date independently from creation date
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_product_orders_invoice_date ON product_orders(invoice_date);

-- Comment explaining the change
-- invoice_date: The date shown on the invoice/quote (editable by user)
-- created_at: The date the order was created in the system (auto-set, immutable)
