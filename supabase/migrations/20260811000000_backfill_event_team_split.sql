-- The styling/travels split (20260809180000) only applied to bookings
-- confirmed after it shipped — 111 existing work orders still carried the
-- old single 'event_team' task, so the Team & Travel assign-stylist panel
-- had nothing to attach to for any pre-existing rental booking. Backfill a
-- styling + travels pair for each of them, mirroring the same shape the
-- trigger now creates for new bookings. The original event_team rows are
-- left in place (harmless, no code reads them anymore) rather than deleted.

INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist, assigned_to, completed_at)
SELECT
  et.work_order_id,
  'styling',
  'ST-' || LPAD(nextval('task_number_seq_st')::TEXT, 4, '0'),
  regexp_replace(et.title, '^Event Setup & Handover', 'Event Styling & Handover'),
  et.status,
  'Set up at event location and acquire client signature.',
  '[{"text":"Team Reached","checked":false},{"text":"Setup Complete","checked":false},{"text":"Photos Taken","checked":false},{"text":"Client Sign-off","checked":false}]'::jsonb,
  et.assigned_to,
  et.completed_at
FROM work_order_tasks et
WHERE et.department = 'event_team'
  AND NOT EXISTS (
    SELECT 1 FROM work_order_tasks st WHERE st.work_order_id = et.work_order_id AND st.department = 'styling'
  );

INSERT INTO work_order_tasks (work_order_id, department, task_number, title, status, instructions, checklist)
SELECT
  et.work_order_id,
  'travels',
  'TR-' || LPAD(nextval('task_number_seq_tr')::TEXT, 4, '0'),
  regexp_replace(et.title, '^Event Setup & Handover -', 'Travel Coordination -'),
  'pending',
  'Arrange team travel and track arrival at event location.',
  '[{"text":"Tickets Booked","checked":false},{"text":"Team Departed","checked":false},{"text":"Reached Venue","checked":false}]'::jsonb
FROM work_order_tasks et
WHERE et.department = 'event_team'
  AND NOT EXISTS (
    SELECT 1 FROM work_order_tasks tr WHERE tr.work_order_id = et.work_order_id AND tr.department = 'travels'
  );
