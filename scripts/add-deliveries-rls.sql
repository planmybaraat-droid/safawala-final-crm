-- Secure RLS for deliveries table
-- Safe to run multiple times

-- Helpers
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

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Optional: force_rls to block bypass even for table owner through insecure paths
-- ALTER TABLE deliveries FORCE ROW LEVEL SECURITY;

-- Drop overly broad policies if present
DO $$BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Enable all for authenticated users' AND polrelid = 'deliveries'::regclass) THEN
    EXECUTE 'DROP POLICY "Enable all for authenticated users" ON deliveries';
  END IF;
END$$;

-- SELECT: tenant or super_admin
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'deliveries_select' AND polrelid = 'deliveries'::regclass
  ) THEN
    EXECUTE $$CREATE POLICY deliveries_select ON deliveries FOR SELECT
      USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
  END IF;
END$$;

-- INSERT: must insert into own tenant unless super_admin
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'deliveries_insert' AND polrelid = 'deliveries'::regclass
  ) THEN
    EXECUTE $$CREATE POLICY deliveries_insert ON deliveries FOR INSERT
      WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
  END IF;
END$$;

-- UPDATE: only within own tenant
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'deliveries_update' AND polrelid = 'deliveries'::regclass
  ) THEN
    EXECUTE $$CREATE POLICY deliveries_update ON deliveries FOR UPDATE
      USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
      WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
  END IF;
END$$;

-- DELETE: only within own tenant
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'deliveries_delete' AND polrelid = 'deliveries'::regclass
  ) THEN
    EXECUTE $$CREATE POLICY deliveries_delete ON deliveries FOR DELETE
      USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
  END IF;
END$$;

-- Optional: Stamp created_by from auth.uid()
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliveries_set_created_by ON deliveries;
CREATE TRIGGER trg_deliveries_set_created_by
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();
