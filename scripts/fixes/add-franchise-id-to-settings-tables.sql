-- Ensure franchise_id exists on settings tables and add indexes
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_settings','branding_settings','banking_details'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=t AND column_name='franchise_id'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN franchise_id UUID REFERENCES public.franchises(id)', t);
        RAISE NOTICE '✅ Added franchise_id to %', t;
      ELSE
        RAISE NOTICE '⏭️  % already has franchise_id', t;
      END IF;

      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_franchise_id ON public.%I(franchise_id)', t, t);
    ELSE
      RAISE NOTICE 'ℹ️  Table % does not exist, skipping', t;
    END IF;
  END LOOP;
END $$;
