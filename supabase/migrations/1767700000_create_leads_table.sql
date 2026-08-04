-- Create leads table for public package enquiries
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  event_date date,
  location text,
  message text,
  package_interest text,
  status text default 'new' check (status in ('new', 'contacted', 'interested', 'converted', 'lost')),
  source text default 'website',
  franchise_id uuid references public.franchises(id),
  assigned_to uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.leads enable row level security;

-- Allow insert from public (no auth needed for lead capture)
create policy "Anyone can insert leads" on public.leads
  for insert with check (true);

-- Only authenticated staff can read/update leads
create policy "Staff can read leads" on public.leads
  for select using (auth.role() = 'authenticated');

create policy "Staff can update leads" on public.leads
  for update using (auth.role() = 'authenticated');
