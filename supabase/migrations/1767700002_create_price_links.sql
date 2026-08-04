-- Price links: admin-generated shareable links with custom pricing
create table if not exists public.package_price_links (
  id uuid default gen_random_uuid() primary key,
  link_key text unique not null default substr(md5(random()::text), 1, 12),
  label text,
  custom_prices jsonb default '{}',
  is_active boolean default true,
  view_count integer default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default null
);

alter table public.package_price_links enable row level security;
create policy "Anyone can read active price links" on public.package_price_links
  for select using (is_active = true);
