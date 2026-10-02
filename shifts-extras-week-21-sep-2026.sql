-- AquaPro — extra shifts, week of 21 September 2026 (on top of Caleb's, Angus's and Tahi's runs)
--   Tue 22: Angus adds PACE 3058. Leonie + Tony do Better Health; Leonie does the microbiological testing.
--   Wed 23 / Thu 24 / Fri 25: Angus adds Better Health (first, 4:30) and PACE 3058 (last).
-- Safe to re-run.

-- 1. Wed/Thu/Fri: make room for Better Health first — push Angus's existing stops those days back an hour
--    (only the first time: skipped once a Better Health shift exists that day)
update shifts s
set scheduled_start = s.scheduled_start + interval '1 hour'
from staff st
where s.staff_id = st.id and st.first_name ilike 'Angus'
  and (s.scheduled_start at time zone 'Australia/Melbourne')::date in (date '2026-09-23', date '2026-09-24', date '2026-09-25')
  and not exists (
    select 1 from shifts b join pools bp on bp.id = b.pool_id
    where b.staff_id = s.staff_id and bp.name ilike '%Better Health%'
      and (b.scheduled_start at time zone 'Australia/Melbourne')::date = (s.scheduled_start at time zone 'Australia/Melbourne')::date
  );

-- 2. The new shifts
with plan(first_name, day, site_pattern, start_at, kind, note) as (values
  ('Angus',  date '2026-09-22', '%PACE 3058%',     '12:00', 'service_visit', null),
  ('Leonie', date '2026-09-22', '%Better Health%', '04:30', 'inspection',    'Microbiological testing — collect samples for the lab'),
  ('Tony',   date '2026-09-22', '%Better Health%', '04:30', 'service_visit', null),
  ('Angus',  date '2026-09-23', '%Better Health%', '04:30', 'service_visit', null),
  ('Angus',  date '2026-09-23', '%PACE 3058%',     '13:00', 'service_visit', null),
  ('Angus',  date '2026-09-24', '%Better Health%', '04:30', 'service_visit', null),
  ('Angus',  date '2026-09-24', '%PACE 3058%',     '13:00', 'service_visit', null),
  ('Angus',  date '2026-09-25', '%Better Health%', '04:30', 'service_visit', null),
  ('Angus',  date '2026-09-25', '%PACE 3058%',     '13:00', 'service_visit', null)
)
insert into shifts (staff_id, pool_id, shift_type, scheduled_start, status, notes)
select st.id, p.id, plan.kind, (plan.day::text || ' ' || plan.start_at || '+10')::timestamptz, 'scheduled', plan.note
from plan
join lateral (select id from staff where first_name ilike plan.first_name || '%' and is_active order by last_name limit 1) st on true
join lateral (select id from pools where name ilike plan.site_pattern order by name limit 1) p on true
where not exists (
  select 1 from shifts s
  where s.staff_id = st.id and s.pool_id = p.id and (s.scheduled_start at time zone 'Australia/Melbourne')::date = plan.day
);

-- Check: everyone, Tue–Thu
select to_char(s.scheduled_start at time zone 'Australia/Melbourne', 'Dy DD Mon HH24:MI') as start_melb,
       st.first_name as tech, p.name as site, s.shift_type, s.notes
from shifts s
join staff st on st.id = s.staff_id
join pools p on p.id = s.pool_id
where s.scheduled_start >= '2026-09-22 00:00+10' and s.scheduled_start < '2026-09-26 00:00+10'
order by st.first_name, s.scheduled_start;
