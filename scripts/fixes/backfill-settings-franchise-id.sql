-- Optional: backfill settings.franchise_id if NULL
-- This uses a default franchise (HQ) if provided; otherwise, leaves NULLs as-is.

-- Set this to your HQ/super franchise if you want a default for orphaned rows
DO $$
DECLARE
  v_default_franchise uuid := NULL; -- put your HQ franchise id here if desired
BEGIN
  IF v_default_franchise IS NOT NULL THEN
    UPDATE public.company_settings SET franchise_id = v_default_franchise WHERE franchise_id IS NULL;
    UPDATE public.branding_settings SET franchise_id = v_default_franchise WHERE franchise_id IS NULL;
    UPDATE public.banking_details SET franchise_id = v_default_franchise WHERE franchise_id IS NULL;
  END IF;
END $$;
