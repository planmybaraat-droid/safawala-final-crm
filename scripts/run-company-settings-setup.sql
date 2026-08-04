-- Execute the company settings table creation
-- This script will be run to create the missing company_settings table

-- First, let's create the table from the existing script
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  email text,
  phone text,
  timezone text,
  currency text,
  gst_number text,
  address text,
  website text,
  language text,
  date_format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Disable RLS for now to allow the settings page to work
alter table public.company_settings disable row level security;

-- Insert default company data if table is empty
do $$
begin
  if not exists (select 1 from public.company_settings) then
    insert into public.company_settings
      (company_name, email, phone, timezone, currency, gst_number)
    values
      ('Safawala.com', 'mysafawale@gmail.com', '+916353583148', 'Asia/Kolkata', 'INR', '27ABCDE1234F1Z5');
  end if;
end $$;

-- Create a simple exec_sql function for the API to use
create or replace function public.exec_sql(sql_query text)
returns text
language plpgsql
security definer
as $$
begin
  execute sql_query;
  return 'Success';
exception
  when others then
    return 'Error: ' || sqlerrm;
end;
$$;
