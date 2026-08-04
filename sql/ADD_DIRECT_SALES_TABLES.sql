-- ============================================================================
-- ADD_DIRECT_SALES_TABLES.sql
-- 
-- Creates dedicated tables for direct product sales with RLS, indexes, and triggers.
-- Separates direct sales from rentals for clarity and independent evolution.
-- 
-- Tables:
--   - direct_sales_orders: Header for a direct sales order (DSL* prefix)
--   - direct_sales_items: Line items for products in a direct sale
--   - Includes RLS, indexes, triggers for updated_at
-- ============================================================================

-- 1. DIRECT SALES ORDERS TABLE
CREATE TABLE IF NOT EXISTS direct_sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE, -- e.g. DSL1234567890
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  franchise_id uuid NOT NULL REFERENCES franchises(id) ON DELETE RESTRICT,
  
  -- Sale specifics (no event/return dates needed)
  sale_date timestamptz NOT NULL DEFAULT now(), -- When the sale is/was made
  delivery_date timestamptz, -- Optional delivery schedule
  venue_address text, -- Delivery location
  
  -- Contact info for sale
  groom_name text,
  groom_whatsapp text,
  groom_address text,
  bride_name text,
  bride_whatsapp text,
  bride_address text,
  
  -- Payment
  payment_method text NOT NULL DEFAULT 'Cash / Offline Payment',
  payment_type text NOT NULL DEFAULT 'full' CHECK (payment_type IN ('full', 'advance', 'partial')),
  
  -- Amounts
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  coupon_discount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  
  -- Payment tracking
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  pending_amount numeric(12,2) NOT NULL DEFAULT 0,
  security_deposit numeric(12,2) NOT NULL DEFAULT 0, -- Usually 0 for sales
  
  -- Status and metadata
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'delivered', 'order_complete', 'cancelled')),
  notes text,
  sales_closed_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for direct sales orders
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_franchise ON direct_sales_orders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_customer ON direct_sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_sale_date ON direct_sales_orders(sale_date);
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_status ON direct_sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_created ON direct_sales_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_sale_number ON direct_sales_orders(sale_number);

-- Covering index for common sale reports
CREATE INDEX IF NOT EXISTS idx_direct_sales_orders_franchise_status_created 
  ON direct_sales_orders(franchise_id, status, created_at DESC) 
  INCLUDE (total_amount, amount_paid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trg_direct_sales_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_direct_sales_orders ON direct_sales_orders;
CREATE TRIGGER set_timestamp_direct_sales_orders
BEFORE UPDATE ON direct_sales_orders
FOR EACH ROW
EXECUTE FUNCTION trg_direct_sales_orders_updated_at();

-- 2. DIRECT SALES ITEMS TABLE
CREATE TABLE IF NOT EXISTS direct_sales_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES direct_sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for direct sales items
CREATE INDEX IF NOT EXISTS idx_direct_sales_items_sale ON direct_sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_direct_sales_items_product ON direct_sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_direct_sales_items_created ON direct_sales_items(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trg_direct_sales_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_direct_sales_items ON direct_sales_items;
CREATE TRIGGER set_timestamp_direct_sales_items
BEFORE UPDATE ON direct_sales_items
FOR EACH ROW
EXECUTE FUNCTION trg_direct_sales_items_updated_at();

-- 3. ENABLE RLS ON BOTH TABLES
ALTER TABLE direct_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_sales_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR DIRECT_SALES_ORDERS
-- Super admins and franchise users can see their own sales
DROP POLICY IF EXISTS "dso_select_franchise" ON direct_sales_orders;
DROP POLICY IF EXISTS "dso_insert_franchise" ON direct_sales_orders;
DROP POLICY IF EXISTS "dso_update_franchise" ON direct_sales_orders;
DROP POLICY IF EXISTS "dso_delete_franchise" ON direct_sales_orders;

CREATE POLICY "dso_select_franchise" ON direct_sales_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = direct_sales_orders.franchise_id)
    )
  );

CREATE POLICY "dso_insert_franchise" ON direct_sales_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = direct_sales_orders.franchise_id)
    )
  );

CREATE POLICY "dso_update_franchise" ON direct_sales_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = direct_sales_orders.franchise_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = direct_sales_orders.franchise_id)
    )
  );

CREATE POLICY "dso_delete_franchise" ON direct_sales_orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = direct_sales_orders.franchise_id)
    )
  );

-- 5. RLS POLICIES FOR DIRECT_SALES_ITEMS
-- Derive franchise access from parent direct_sales_orders
DROP POLICY IF EXISTS "dsi_select_franchise" ON direct_sales_items;
DROP POLICY IF EXISTS "dsi_insert_franchise" ON direct_sales_items;
DROP POLICY IF EXISTS "dsi_update_franchise" ON direct_sales_items;
DROP POLICY IF EXISTS "dsi_delete_franchise" ON direct_sales_items;

CREATE POLICY "dsi_select_franchise" ON direct_sales_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN direct_sales_orders dso ON dso.id = direct_sales_items.sale_id
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = dso.franchise_id)
    )
  );

CREATE POLICY "dsi_insert_franchise" ON direct_sales_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN direct_sales_orders dso ON dso.id = direct_sales_items.sale_id
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = dso.franchise_id)
    )
  );

CREATE POLICY "dsi_update_franchise" ON direct_sales_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN direct_sales_orders dso ON dso.id = direct_sales_items.sale_id
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = dso.franchise_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN direct_sales_orders dso ON dso.id = direct_sales_items.sale_id
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = dso.franchise_id)
    )
  );

CREATE POLICY "dsi_delete_franchise" ON direct_sales_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN direct_sales_orders dso ON dso.id = direct_sales_items.sale_id
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = dso.franchise_id)
    )
  );

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON direct_sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON direct_sales_items TO authenticated;

-- 7. BACKWARD COMPATIBILITY VIEW
-- Union direct sales orders and product orders (for legacy queries that expect all sales in one table)
CREATE OR REPLACE VIEW product_orders_all AS
SELECT 
  id,
  order_number AS sale_number,
  'product_order' AS source,
  customer_id,
  franchise_id,
  event_date AS sale_date,
  booking_type,
  is_quote,
  payment_method,
  payment_type,
  subtotal_amount,
  discount_amount,
  coupon_code,
  coupon_discount,
  tax_amount,
  total_amount,
  amount_paid,
  pending_amount,
  security_deposit,
  status,
  notes,
  notes AS special_instructions,
  sales_closed_by_id,
  created_at,
  updated_at
FROM product_orders
WHERE booking_type = 'sale' AND NOT is_quote

UNION ALL

SELECT 
  id,
  sale_number,
  'direct_sales' AS source,
  customer_id,
  franchise_id,
  sale_date,
  'sale' AS booking_type,
  false AS is_quote,
  payment_method,
  payment_type,
  subtotal_amount,
  discount_amount,
  coupon_code,
  coupon_discount,
  tax_amount,
  total_amount,
  amount_paid,
  pending_amount,
  security_deposit,
  status,
  notes,
  notes AS special_instructions,
  sales_closed_by_id,
  created_at,
  updated_at
FROM direct_sales_orders
ORDER BY created_at DESC;

-- 8. ORPHAN CHECK (optional but recommended)
-- Verify no orphaned items without parent orders
SELECT 'orphan: direct_sales_items.sale_id' AS check_name, COUNT(*)::BIGINT AS rows
FROM direct_sales_items i
WHERE NOT EXISTS (SELECT 1 FROM direct_sales_orders o WHERE o.id = i.sale_id);

SELECT 'orphan: direct_sales_items.product_id' AS check_name, COUNT(*)::BIGINT AS rows
FROM direct_sales_items i
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = i.product_id);

-- 9. COMMENTS
COMMENT ON TABLE direct_sales_orders IS 'Dedicated table for direct product sales (DSL* prefix). Separate from rentals (product_orders) for clarity and independent evolution.';
COMMENT ON COLUMN direct_sales_orders.sale_date IS 'Date of the sale transaction.';
COMMENT ON COLUMN direct_sales_orders.status IS 'confirmed → delivered → order_complete (final), or cancelled.';
COMMENT ON COLUMN direct_sales_orders.security_deposit IS 'Usually 0 for direct sales. Included for consistency with rental data.';
COMMENT ON TABLE direct_sales_items IS 'Line items for products in a direct sale. Linked to direct_sales_orders via sale_id.';

-- 10. INFORMATIONAL: Counts and migration prep
-- Check how many legacy sales exist in product_orders (for potential backfill)
-- SELECT COUNT(*) FROM product_orders WHERE booking_type='sale' AND NOT is_quote;

-- Check if direct_sales tables are accessible
-- SELECT COUNT(*) FROM direct_sales_orders;
-- SELECT COUNT(*) FROM direct_sales_items;
