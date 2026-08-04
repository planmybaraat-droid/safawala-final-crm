-- Add session_token to users table for single-device login enforcement
alter table public.users add column if not exists session_token text default null;
alter table public.users add column if not exists session_created_at timestamptz default null;

-- Index for fast token lookups
create index if not exists users_session_token_idx on public.users (session_token);
