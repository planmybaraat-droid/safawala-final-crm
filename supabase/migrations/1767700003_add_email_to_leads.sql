-- Add email column to public.leads table if it does not exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
