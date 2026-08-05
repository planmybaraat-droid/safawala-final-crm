-- Fine-grained role for the standalone HR Portal app, independent of the
-- CRM's users.role column (which only knows super_admin/franchise_admin/
-- staff/readonly). Additive and nullable — no effect on existing CRM auth.

alter table public.users add column if not exists hr_role text;

alter table public.users add constraint users_hr_role_check
  check (hr_role is null or hr_role = any (array[
    'hr_manager','hr_executive','recruiter','payroll_staff'
  ]::text[]));

comment on column public.users.hr_role is
  'Fine-grained role used only by the standalone HR Portal app. Independent of the CRM role column.';
