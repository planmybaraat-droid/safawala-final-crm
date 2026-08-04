-- Step 8: Temporarily disable Foreign Keys
-- Two safe options provided. Choose ONE:
-- A) Preferred temporary bypass: DISABLE TRIGGER ALL on child tables (FK checks are trigger-based)
-- B) Alternative: DROP CONSTRAINTS (you'll re-add with 02_add_fks_not_valid.sql later)

-- =========================
-- A) Disable FK triggers
-- =========================
-- Note: Requires superuser/owner (role `postgres` in Supabase SQL Editor). Reversible via ENABLE TRIGGER ALL.
begin;
alter table if exists product_order_items disable trigger all;  -- disables FK order_id, product_id checks
alter table if exists package_booking_items disable trigger all; -- disables FK booking_id, package_id, variant_id checks
commit;

-- =========================
-- B) (Alternative) Drop FK constraints by name
-- =========================
-- Uncomment if you prefer to drop instead of disabling triggers
-- begin;
-- alter table if exists product_order_items drop constraint if exists fk_poi_order;
-- alter table if exists product_order_items drop constraint if exists fk_poi_product;
-- alter table if exists package_booking_items drop constraint if exists fk_pbi_booking;
-- alter table if exists package_booking_items drop constraint if exists fk_pbi_package;
-- alter table if exists package_booking_items drop constraint if exists fk_pbi_variant;
-- commit;
