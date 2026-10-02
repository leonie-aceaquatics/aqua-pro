-- AquaPro — Angus's run for the week of Monday 21 September 2026
-- All staff start at 4:30 am; later sites are 90 minutes apart — a guide
-- for ORDER only. Angus taps Start / Finish on site and that is what hours are counted from.
-- Safe to re-run: existing shifts are skipped.
-- Melbourne time (AEST, +10).

with tech as (
  select id from staff where first_name ilike 'Angus' and is_active order by last_name limit 1
),
plan(day, site_pattern, start_at, kind, note) as (values
  -- ── Monday 21 September ──
  ('2026-09-21', '%Warburton%',         '04:30', 'service_visit', null),
  ('2026-09-21', '%Seville%',           '06:00', 'service_visit', null),
  ('2026-09-21', '%Eltham%',            '07:30', 'service_visit', 'Clean the flooring mats. Deliver 1 x sodium bisulphate.'),
  ('2026-09-21', '%Peppers%',           '09:00', 'chemical_delivery', 'Deliver 1 x acid and 5 x chlorine'),
  -- ── Tuesday 22 September ──
  ('2026-09-22', '%Westerfolds%',       '04:30', 'service_visit', null),
  ('2026-09-22', '%Eltham%',            '06:00', 'service_visit', null),
  ('2026-09-22', '%Matildas%Spa%',      '07:30', 'service_visit', null),
  ('2026-09-22', '%Matildas%Cold%',     '07:31', 'service_visit', null),
  ('2026-09-22', '%Matildas%River%',    '07:32', 'service_visit', null),
  ('2026-09-22', '%Warburton%',         '09:00', 'service_visit', null),
  ('2026-09-22', '%Seville%',           '10:30', 'service_visit', null),
  -- ── Wednesday 23 September ──
  ('2026-09-23', '%Westerfolds%',       '04:30', 'service_visit', null),
  ('2026-09-23', '%Eltham%',            '06:00', 'service_visit', null),
  ('2026-09-23', '%Matildas%Spa%',      '07:30', 'service_visit', null),
  ('2026-09-23', '%Matildas%Cold%',     '07:31', 'service_visit', null),
  ('2026-09-23', '%Matildas%River%',    '07:32', 'service_visit', null),
  ('2026-09-23', '%Warburton%',         '09:00', 'service_visit', null),
  ('2026-09-23', '%Seville%',           '10:30', 'service_visit', null),
  -- ── Thursday 24 September ──
  ('2026-09-24', '%Westerfolds%',       '04:30', 'service_visit', null),
  ('2026-09-24', '%Eltham%',            '06:00', 'service_visit', null),
  ('2026-09-24', '%Matildas%Spa%',      '07:30', 'service_visit', null),
  ('2026-09-24', '%Matildas%Cold%',     '07:31', 'service_visit', null),
  ('2026-09-24', '%Matildas%River%',    '07:32', 'service_visit', null),
  ('2026-09-24', '%Warburton%',         '09:00', 'service_visit', null),
  ('2026-09-24', '%Seville%',           '10:30', 'service_visit', null),
  -- ── Friday 25 September ──
  ('2026-09-25', '%Flinders%Pool%',     '04:30', 'service_visit', null),
  ('2026-09-25', '%Flinders%Spa%',      '06:00', 'service_visit', null),
  ('2026-09-25', '%Meridian%',          '07:30', 'service_visit', null),
  ('2026-09-25', '%Seville%',           '09:00', 'service_visit', null),
  ('2026-09-25', '%Warburton%',         '10:30', 'service_visit', null)
)
insert into shifts (staff_id, pool_id, shift_type, scheduled_start, status, notes)
select tech.id, p.id, plan.kind, (plan.day || ' ' || plan.start_at || '+10')::timestamptz, 'scheduled', plan.note
from plan
join lateral (select id from pools where name ilike plan.site_pattern order by name limit 1) p on true
cross join tech
where not exists (
  select 1 from shifts s
  where s.staff_id = tech.id and s.pool_id = p.id and s.shift_type = plan.kind
    and s.scheduled_start::date = plan.day::date
);

-- Check: should be 30 rows. Empty = the name 'Angus' didn't match anyone in Staff.
select to_char(s.scheduled_start at time zone 'Australia/Melbourne', 'Dy DD Mon HH24:MI') as start_melb,
       p.name as site, s.shift_type, s.notes
from shifts s
join staff st on st.id = s.staff_id
join pools p on p.id = s.pool_id
where st.first_name ilike 'Angus'
  and s.scheduled_start >= '2026-09-21 00:00+10' and s.scheduled_start < '2026-09-28 00:00+10'
order by s.scheduled_start;
