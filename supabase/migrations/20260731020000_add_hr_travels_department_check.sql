-- The users_department_check constraint never included 'hr' or 'travels',
-- even though both are valid portals in lib/portal-config.ts. This silently
-- blocked creating any HR or Travels staff account. Safe to run repeatedly.

alter table public.users drop constraint if exists users_department_check;

alter table public.users add constraint users_department_check
  check (department is null or department = any (array[
    'admin','manager','booking','warehouse','qc','delivery',
    'styling','accounts','franchise','hr','travels'
  ]::text[]));
