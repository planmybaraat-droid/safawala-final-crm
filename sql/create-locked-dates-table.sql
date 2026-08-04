-- Run this in your Supabase SQL editor to create the locked_dates table

create table if not exists locked_dates (
  id          uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references franchises(id) on delete cascade,
  locked_date  date not null,
  whatsapp_number text,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- Index for fast franchise+date lookups
create index if not exists idx_locked_dates_franchise_date
  on locked_dates (franchise_id, locked_date);

-- RLS
alter table locked_dates enable row level security;

create policy "franchise_isolation" on locked_dates
  using (franchise_id = (
    select franchise_id from user_profiles where id = auth.uid()
  ));
