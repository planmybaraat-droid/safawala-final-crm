-- Idempotent creation of the company_settings table and a seed row.

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

alter table public.company_settings disable row level security;

do $$
begin
  if not exists (select 1 from public.company_settings) then
    insert into public.company_settings
      (company_name, email, phone, timezone, currency, gst_number)
    values
      ('Safawala Laundry Services', 'info@safawala.com', '+91 9876543210', 'Asia/Kolkata', 'INR', '27AAAAA0000A1Z5');
  end if;
end $$;
