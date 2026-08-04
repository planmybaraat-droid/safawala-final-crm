-- RLS Improvements Template for Safawala CRM
-- Apply principle of least privilege and franchise isolation

-- 1) Helpers (idempotent)
CREATE OR REPLACE FUNCTION jwt_franchise_id()
RETURNS uuid STABLE LANGUAGE sql AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
  )
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean STABLE LANGUAGE sql AS $$
  SELECT (auth.jwt() ->> 'app_role') = 'super_admin'
         OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'super_admin';
$$;

-- 2) Example policy pattern for a tenant table with franchise_id
-- Replace <table_name> with the actual table.
DO $$ BEGIN
  -- Enable RLS
  EXECUTE 'ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY';

  -- Drop unsafe wide-open policies (if any)
  EXECUTE $$DO $$BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE polname ILIKE 'Enable all for authenticated users' AND polrelid = '<table_name>'::regclass) THEN
      EXECUTE 'DROP POLICY "Enable all for authenticated users" ON <table_name>';
    END IF;
  END$$;$$;

  -- SELECT limited to tenant or super_admin
  EXECUTE 'CREATE POLICY IF NOT EXISTS "tenant_select" ON <table_name> FOR SELECT
           USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())';

  -- INSERT must set franchise_id = jwt_franchise_id()
  EXECUTE 'CREATE POLICY IF NOT EXISTS "tenant_insert" ON <table_name> FOR INSERT
           WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())';

  -- UPDATE only within tenant
  EXECUTE 'CREATE POLICY IF NOT EXISTS "tenant_update" ON <table_name> FOR UPDATE
           USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
           WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())';

  -- DELETE only within tenant
  EXECUTE 'CREATE POLICY IF NOT EXISTS "tenant_delete" ON <table_name> FOR DELETE
           USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())';
END $$;

-- 3) Apply to key tables (copy/paste and replace <table_name>):
-- customers, products, bookings, booking_items (via join), payments, purchases, purchase_items, expenses,
-- laundry_batches, laundry_batch_items, deliveries, activity_logs

-- 4) For tables missing franchise_id (e.g., vendors), decide:
--    a) Add franchise_id and apply tenant policies; or
--    b) Keep read-only shared catalog: create SELECT policy allowing all authenticated but restrict INSERT/UPDATE/DELETE to super_admin only.

-- Example shared, read-only to tenants:
-- ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Enable all for authenticated users" ON vendors;
-- CREATE POLICY IF NOT EXISTS vendors_read ON vendors FOR SELECT USING (true);
-- CREATE POLICY IF NOT EXISTS vendors_write_admin ON vendors FOR ALL USING (app_is_super_admin()) WITH CHECK (app_is_super_admin());
