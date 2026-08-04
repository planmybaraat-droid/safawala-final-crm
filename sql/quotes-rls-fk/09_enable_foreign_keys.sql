-- Step 9: Re-enable Foreign Keys after temporary disable
-- Choose the matching method you used in Step 8

-- =========================
-- If you used DISABLE TRIGGER ALL
-- =========================
begin;
alter table if exists product_order_items enable trigger all;
alter table if exists package_booking_items enable trigger all;
commit;

-- =========================
-- If you DROPPED constraints in Step 8 (method B), re-add them now
-- =========================
-- You can simply run the existing script: 02_add_fks_not_valid.sql
-- Then run: 03b_orphan_checks_consolidated.sql -> 04_cleanup_templates.sql (if needed) -> 05_validate_constraints.sql
