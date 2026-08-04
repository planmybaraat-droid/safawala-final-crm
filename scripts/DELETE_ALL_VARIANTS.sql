-- This version safely handles existing bookings by unlinking referenced variants
-- from your franchise instead of deleting them (so history remains intact).

-- Set your franchise here (Surat)
DO $$ BEGIN END $$; -- no-op to allow BEGIN below in Supabase editor

BEGIN;

-- Parameters
-- Surat Branch Franchise ID
-- If you need a different franchise, replace the UUID below
WITH params AS (
  SELECT '1a518dde-85b7-44ef-8bc4-092f53ddfd99'::uuid AS franchise_id
)

-- 1) Snapshot counts before
, counts_before AS (
  SELECT 
    (SELECT COUNT(*) FROM package_variants pv JOIN params p ON true WHERE pv.franchise_id = p.franchise_id) AS total_for_franchise,
    (SELECT COUNT(*) FROM package_variants) AS total_all
)

-- 2) Unlink variants that are referenced by bookings (cannot delete due to FK)
, unlinked AS (
  UPDATE package_variants pv
  SET 
    franchise_id = NULL,
    is_active = false,
    updated_at = NOW()
  FROM params p
  WHERE pv.franchise_id = p.franchise_id
    AND EXISTS (
      SELECT 1 FROM package_booking_items pbi 
      WHERE pbi.variant_id = pv.id
    )
  RETURNING 1
)

-- 3) Hard delete variants that are NOT referenced by bookings
, deleted AS (
  DELETE FROM package_variants pv
  USING params p
  WHERE pv.franchise_id = p.franchise_id
    AND NOT EXISTS (
      SELECT 1 FROM package_booking_items pbi 
      WHERE pbi.variant_id = pv.id
    )
  RETURNING 1
)

-- 4) Emit a compact summary row
SELECT 
  (SELECT total_for_franchise FROM counts_before)        AS variants_before_for_franchise,
  (SELECT total_all FROM counts_before)                  AS total_all_before,
  (SELECT COUNT(*) FROM unlinked)                        AS unlinked_due_to_bookings,
  (SELECT COUNT(*) FROM deleted)                         AS hard_deleted,
  (SELECT COUNT(*) FROM package_variants pv)             AS total_all_after,
  (SELECT COUNT(*) FROM package_variants pv 
     JOIN params p ON true 
    WHERE pv.franchise_id = p.franchise_id)              AS remaining_linked_to_franchise
;

COMMIT;

-- Verification: list any variants still linked to the franchise (should be 0)
WITH p AS (SELECT '1a518dde-85b7-44ef-8bc4-092f53ddfd99'::uuid AS franchise_id)
SELECT pv.id, pv.name, pv.franchise_id, pv.is_active
FROM package_variants pv
JOIN p ON pv.franchise_id = p.franchise_id
ORDER BY pv.updated_at DESC NULLS LAST;

-- Verification: show any variants that were unlinked (now is_active=false and franchise_id is NULL)
SELECT pv.id, pv.name, pv.franchise_id, pv.is_active
FROM package_variants pv
WHERE pv.franchise_id IS NULL AND pv.is_active = false
  AND EXISTS (SELECT 1 FROM package_booking_items pbi WHERE pbi.variant_id = pv.id)
ORDER BY pv.updated_at DESC NULLS LAST
LIMIT 50;
