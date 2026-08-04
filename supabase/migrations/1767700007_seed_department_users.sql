-- Seed department portal users into the users table
-- Uses the first franchise in the DB so queries return real data
-- Safe to run multiple times (upsert by email)

DO $$
DECLARE
  v_franchise_id  uuid;
  v_franchise_name text;
  v_franchise_code text;
BEGIN
  -- Grab the first/primary franchise
  SELECT id, name, code
    INTO v_franchise_id, v_franchise_name, v_franchise_code
    FROM franchises
    ORDER BY created_at ASC
    LIMIT 1;

  IF v_franchise_id IS NULL THEN
    RAISE NOTICE 'No franchise found — skipping department user seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding dept users for franchise: % (%)', v_franchise_name, v_franchise_id;

  -- booking@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000003',
    'booking@safawala.com',
    'Booking Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":true,"packages":false,"vendors":false,"quotes":true,"invoices":true,"laundry":false,"expenses":false,"deliveries":false,"productArchive":false,"payroll":false,"attendance":false,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":true}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- bookings@safawala.com  (the email the user wants to add)
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000004',
    'bookings@safawala.com',
    'Bookings Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":true,"packages":false,"vendors":false,"quotes":true,"invoices":true,"laundry":false,"expenses":false,"deliveries":false,"productArchive":false,"payroll":false,"attendance":false,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":true}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- warehouse@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000011',
    'warehouse@safawala.com',
    'Warehouse Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":true,"packages":false,"vendors":false,"quotes":false,"invoices":false,"laundry":true,"expenses":false,"deliveries":true,"productArchive":false,"payroll":false,"attendance":true,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- accounts@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000001',
    'accounts@safawala.com',
    'Accounts Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":false,"packages":false,"vendors":false,"quotes":true,"invoices":true,"laundry":false,"expenses":true,"deliveries":false,"productArchive":false,"payroll":true,"attendance":false,"reports":true,"financials":true,"franchises":false,"staff":false,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- delivery@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000005',
    'delivery@safawala.com',
    'Delivery Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":false,"customers":false,"inventory":false,"packages":false,"vendors":false,"quotes":false,"invoices":false,"laundry":false,"expenses":false,"deliveries":true,"productArchive":false,"payroll":false,"attendance":true,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- qc@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000009',
    'qc@safawala.com',
    'QC Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":false,"customers":false,"inventory":true,"packages":false,"vendors":false,"quotes":false,"invoices":false,"laundry":false,"expenses":false,"deliveries":false,"productArchive":true,"payroll":false,"attendance":true,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- styling@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000010',
    'styling@safawala.com',
    'Styling Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":true,"packages":false,"vendors":false,"quotes":false,"invoices":false,"laundry":false,"expenses":false,"deliveries":false,"productArchive":false,"payroll":false,"attendance":true,"reports":false,"financials":false,"franchises":false,"staff":false,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- hr@safawala.com
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000007',
    'hr@safawala.com',
    'HR Manager',
    'staff',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":false,"customers":false,"inventory":false,"packages":false,"vendors":false,"quotes":false,"invoices":false,"laundry":false,"expenses":true,"deliveries":false,"productArchive":false,"payroll":true,"attendance":true,"reports":true,"financials":false,"franchises":false,"staff":true,"integrations":false,"settings":false}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  -- manager@safawala.com (franchise_admin)
  INSERT INTO users (id, email, name, role, franchise_id, is_active, permissions)
  VALUES (
    '00000000-0000-4000-8001-000000000008',
    'manager@safawala.com',
    'Branch Manager',
    'franchise_admin',
    v_franchise_id,
    true,
    '{"dashboard":true,"bookings":true,"customers":true,"inventory":true,"packages":true,"vendors":true,"quotes":true,"invoices":true,"laundry":true,"expenses":true,"deliveries":true,"productArchive":true,"payroll":true,"attendance":true,"reports":true,"financials":true,"franchises":false,"staff":true,"integrations":false,"settings":true}'
  )
  ON CONFLICT (email) DO UPDATE SET
    franchise_id = EXCLUDED.franchise_id,
    is_active    = true,
    role         = 'franchise_admin',
    permissions  = EXCLUDED.permissions,
    updated_at   = now();

  RAISE NOTICE 'Department users seeded successfully';
END $$;
