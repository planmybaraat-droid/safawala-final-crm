-- leave_requests.leave_type_id was a NOT NULL FK to a leave_types table, but
-- the entire app (app/portal/hr/attendance, app/portal/styling/attendance/leave)
-- has always treated leave type as free text ("sick", "casual", ...) — there
-- is no leave_types management UI anywhere. leave_type_id could never be
-- populated, so every leave request insert was failing. total_days was also
-- NOT NULL with nothing computing it.

alter table public.leave_requests add column if not exists leave_type text;
alter table public.leave_requests alter column leave_type_id drop not null;
alter table public.leave_requests alter column total_days drop not null;
