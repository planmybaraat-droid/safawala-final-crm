-- ================================================================
-- AUTH/RLS BASELINE FOR FRANCHISE ISOLATION (Public schema)
-- ================================================================
-- Goal:
--  - Consistent, minimal, safe RLS across key tables used in CRUD
--  - Enforce that non-service clients can only see/edit their franchise
--  - Make inserts easy by defaulting franchise_id from users mapping
--
-- Assumptions:
--  - There is a public.users table with id = auth.uid() and franchise_id
--  - App uses the 'authenticated' Postgres role for non-service traffic
--  - Service role (supabase service key) bypasses RLS automatically
--
-- Tables covered now:
--  - packages_categories (franchise_id required)
--  - package_variants (franchise_id required via category/variant)
--  - distance_pricing (variant-based, franchise_id required)
--  - customers (franchise_id required)
--  - product_orders, package_bookings (franchise_id required)
--  - product_order_items, package_booking_items (via parent booking franchise)
--
-- You can add more tables following the same pattern below.
-- ================================================================

BEGIN;

-- ------------------------------------------------
-- Helper: get current user's franchise_id
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_franchise_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT u.franchise_id
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;
COMMENT ON FUNCTION public.current_user_franchise_id IS 'Returns the franchise_id for the current auth.uid() from public.users.';

-- ------------------------------------------------
-- Helper trigger: set franchise_id on insert if NULL
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_franchise_id_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.franchise_id IS NULL THEN
    NEW.franchise_id := public.current_user_franchise_id();
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.set_franchise_id_default IS 'Before-insert trigger to set franchise_id from current_user_franchise_id() when missing.';

-- ================================================================
-- packages_categories RLS
-- ================================================================
DO $$
BEGIN
  -- Ensure column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packages_categories' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.packages_categories ADD COLUMN franchise_id uuid REFERENCES public.franchises(id)';
  END IF;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.packages_categories ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='packages_categories') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.packages_categories';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_packages_categories ON public.packages_categories';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_packages_categories BEFORE INSERT ON public.packages_categories FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY packages_categories_select ON public.packages_categories
    FOR SELECT TO authenticated
    USING (franchise_id IS NOT NULL AND franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY packages_categories_insert ON public.packages_categories
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id IS NOT NULL AND franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY packages_categories_update ON public.packages_categories
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY packages_categories_delete ON public.packages_categories
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- package_variants RLS
-- ================================================================
DO $$
BEGIN
  -- Ensure columns (franchise_id may be redundant if enforced via category)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_variants' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.package_variants ADD COLUMN franchise_id uuid';
  END IF;

  -- Best-effort backfill: copy from category when missing
  EXECUTE $$
    UPDATE public.package_variants pv
    SET franchise_id = pc.franchise_id
    FROM public.packages_categories pc
    WHERE pv.category_id = pc.id AND pv.franchise_id IS NULL
  $$;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.package_variants ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='package_variants') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.package_variants';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_package_variants ON public.package_variants';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_package_variants BEFORE INSERT ON public.package_variants FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY package_variants_select ON public.package_variants
    FOR SELECT TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_variants_insert ON public.package_variants
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_variants_update ON public.package_variants
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_variants_delete ON public.package_variants
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- distance_pricing RLS (variant-based)
-- ================================================================
DO $$
BEGIN
  -- Ensure variant-based column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distance_pricing' AND column_name = 'package_variant_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.distance_pricing ADD COLUMN package_variant_id uuid REFERENCES public.package_variants(id) ON DELETE CASCADE';
  END IF;

  -- Ensure franchise_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distance_pricing' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.distance_pricing ADD COLUMN franchise_id uuid REFERENCES public.franchises(id) ON DELETE CASCADE';
  END IF;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.distance_pricing ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='distance_pricing') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.distance_pricing';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_distance_pricing ON public.distance_pricing';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_distance_pricing BEFORE INSERT ON public.distance_pricing FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY distance_pricing_select ON public.distance_pricing
    FOR SELECT TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY distance_pricing_insert ON public.distance_pricing
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY distance_pricing_update ON public.distance_pricing
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY distance_pricing_delete ON public.distance_pricing
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- customers RLS
-- ================================================================
DO $$
BEGIN
  -- Ensure column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.customers ADD COLUMN franchise_id uuid REFERENCES public.franchises(id)';
  END IF;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='customers') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customers';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_customers ON public.customers';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_customers BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY customers_select ON public.customers
    FOR SELECT TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY customers_insert ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY customers_update ON public.customers
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY customers_delete ON public.customers
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- product_orders RLS
-- ================================================================
DO $$
BEGIN
  -- Ensure column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_orders' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.product_orders ADD COLUMN franchise_id uuid REFERENCES public.franchises(id)';
  END IF;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='product_orders') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.product_orders';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_product_orders ON public.product_orders';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_product_orders BEFORE INSERT ON public.product_orders FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY product_orders_select ON public.product_orders
    FOR SELECT TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY product_orders_insert ON public.product_orders
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY product_orders_update ON public.product_orders
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY product_orders_delete ON public.product_orders
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- package_bookings RLS
-- ================================================================
DO $$
BEGIN
  -- Ensure column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_bookings' AND column_name = 'franchise_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.package_bookings ADD COLUMN franchise_id uuid REFERENCES public.franchises(id)';
  END IF;

  -- Enable RLS
  EXECUTE 'ALTER TABLE public.package_bookings ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='package_bookings') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.package_bookings';
  END LOOP;

  -- Trigger to set franchise_id
  EXECUTE 'DROP TRIGGER IF EXISTS set_franchise_id_default_on_package_bookings ON public.package_bookings';
  EXECUTE 'CREATE TRIGGER set_franchise_id_default_on_package_bookings BEFORE INSERT ON public.package_bookings FOR EACH ROW EXECUTE FUNCTION public.set_franchise_id_default()';

  -- Policies
  EXECUTE $$
    CREATE POLICY package_bookings_select ON public.package_bookings
    FOR SELECT TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_bookings_insert ON public.package_bookings
    FOR INSERT TO authenticated
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_bookings_update ON public.package_bookings
    FOR UPDATE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
    WITH CHECK (franchise_id = public.current_user_franchise_id())
  $$;

  EXECUTE $$
    CREATE POLICY package_bookings_delete ON public.package_bookings
    FOR DELETE TO authenticated
    USING (franchise_id = public.current_user_franchise_id())
  $$;
END$$;

-- ================================================================
-- product_order_items RLS (via parent order)
-- ================================================================
DO $$
BEGIN
  -- Enable RLS
  EXECUTE 'ALTER TABLE public.product_order_items ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='product_order_items') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.product_order_items';
  END LOOP;

  -- Policies using parent order's franchise
  EXECUTE $$
    CREATE POLICY product_order_items_select ON public.product_order_items
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.product_orders po
      WHERE po.id = product_order_items.order_id
        AND po.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY product_order_items_insert ON public.product_order_items
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.product_orders po
      WHERE po.id = order_id
        AND po.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY product_order_items_update ON public.product_order_items
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.product_orders po
      WHERE po.id = product_order_items.order_id
        AND po.franchise_id = public.current_user_franchise_id()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.product_orders po
      WHERE po.id = product_order_items.order_id
        AND po.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY product_order_items_delete ON public.product_order_items
    FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.product_orders po
      WHERE po.id = product_order_items.order_id
        AND po.franchise_id = public.current_user_franchise_id()
    ))
  $$;
END$$;

-- ================================================================
-- package_booking_items RLS (via parent booking)
-- ================================================================
DO $$
BEGIN
  -- Enable RLS
  EXECUTE 'ALTER TABLE public.package_booking_items ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='package_booking_items') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.package_booking_items';
  END LOOP;

  -- Policies using parent booking's franchise
  EXECUTE $$
    CREATE POLICY package_booking_items_select ON public.package_booking_items
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.package_bookings pb
      WHERE pb.id = package_booking_items.booking_id
        AND pb.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY package_booking_items_insert ON public.package_booking_items
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.package_bookings pb
      WHERE pb.id = booking_id
        AND pb.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY package_booking_items_update ON public.package_booking_items
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.package_bookings pb
      WHERE pb.id = package_booking_items.booking_id
        AND pb.franchise_id = public.current_user_franchise_id()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.package_bookings pb
      WHERE pb.id = package_booking_items.booking_id
        AND pb.franchise_id = public.current_user_franchise_id()
    ))
  $$;

  EXECUTE $$
    CREATE POLICY package_booking_items_delete ON public.package_booking_items
    FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.package_bookings pb
      WHERE pb.id = package_booking_items.booking_id
        AND pb.franchise_id = public.current_user_franchise_id()
    ))
  $$;
END$$;

COMMIT;

-- ================================================================
-- QUICK VERIFICATION
-- ================================================================
-- 1) Policies present
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename IN (
  'packages_categories','package_variants','distance_pricing',
  'customers','product_orders','package_bookings','product_order_items','package_booking_items'
)
ORDER BY tablename, policyname;

-- 2) Check that franchise_id defaults on insert (run as authenticated user)
-- INSERT INTO packages_categories (name) VALUES ('RLS Test Category - Safe Default');
-- SELECT * FROM packages_categories WHERE name LIKE 'RLS Test Category%';

-- 3) Attempt cross-franchise access should return 0 rows when not service_role.
-- SELECT COUNT(*) FROM packages_categories WHERE franchise_id <> public.current_user_franchise_id();
