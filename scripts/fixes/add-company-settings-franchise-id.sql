-- Safely add franchise_id to company_settings if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'company_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'franchise_id'
    ) THEN
      ALTER TABLE public.company_settings 
        ADD COLUMN franchise_id UUID REFERENCES public.franchises(id);
      RAISE NOTICE '✅ Added franchise_id to company_settings';
    ELSE
      RAISE NOTICE '⏭️  company_settings already has franchise_id';
    END IF;

    -- Create index if not present
    CREATE INDEX IF NOT EXISTS idx_company_settings_franchise_id ON public.company_settings(franchise_id);
  ELSE
    RAISE NOTICE '⚠️  public.company_settings table does not exist';
  END IF;
END $$;
