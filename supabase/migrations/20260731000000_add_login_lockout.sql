-- Account lockout after repeated failed logins. Safe to run repeatedly.

alter table public.users
  add column if not exists failed_login_attempts integer not null default 0;

alter table public.users
  add column if not exists locked_until timestamptz;

create index if not exists users_locked_until_idx
  on public.users(locked_until)
  where locked_until is not null;
