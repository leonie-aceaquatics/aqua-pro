-- AquaPro — Caleb Tansey's run for Monday 21 and Friday 25 September 2026
-- Six sites, first start 4:30 am. Only the 4:30 start was given; the later times are a
-- rough 90-minute spacing so the sites appear in the right ORDER in his Today's Jobs.
-- They're a guide only — Caleb taps Start / Finish on site and that is what hours are counted from.
-- Safe to re-run: a shift already there for the same person, site and start time is skipped.
-- Times are Melbourne (AEST, +10 — daylight saving doesn't start until 4 October).

with tech as (
  select id from staff
  where first_name ilike 'Caleb' and last_name ilike 'Tansey' and is_active
  limit 1
),
plan(day, site_code, start_at, note) as (values
  -- ── Monday 21 September ──────────────────────────────────────────────────
  ('2026-09-21', 'AQ-006-A', '04:30', 'Put the vacuum in'),                           -- Better Health Network, Bentleigh East
  ('2026-09-21', 'AQ-002-A', '06:00', null),                                          -- Embassy Apartments
  ('2026-09-21', 'AQ-016-A', '07:30', null),                                          -- Westerfolds
  ('2026-09-21', 'AQ-015-A', '09:00', null),                                          -- Eltham College
  ('2026-09-21', 'AQ-014-A', '10:30', null),                                          -- Home of the Matildas – Spa
  ('2026-09-21', 'AQ-014-B', '10:31', null),                                          -- Home of the Matildas – Cold Pool
  ('2026-09-21', 'AQ-014-C', '10:32', null),                                          -- Home of the Matildas – River Pool
  ('2026-09-21', 'AQ-013-A', '12:00', null),                                          -- PACE 3058, Coburg
  -- ── Friday 25 September ──────────────────────────────────────────────────
  ('2026-09-25', 'AQ-006-A', '04:30', 'Do the scum lines'),                           -- Better Health Network, Bentleigh East
  ('2026-09-25', 'AQ-002-A', '06:00', null),                                          -- Embassy Apartments
  ('2026-09-25', 'AQ-016-A', '07:30', null),                                          -- Westerfolds
  ('2026-09-25', 'AQ-015-A', '09:00', null),                                          -- Eltham College
  ('2026-09-25', 'AQ-014-A', '10:30', null),                                          -- Home of the Matildas – Spa
  ('2026-09-25', 'AQ-014-B', '10:31', null),                                          -- Home of the Matildas – Cold Pool
  ('2026-09-25', 'AQ-014-C', '10:32', null),                                          -- Home of the Matildas – River Pool
  ('2026-09-25', 'AQ-013-A', '12:00', null)                                           -- PACE 3058, Coburg
)
insert into shifts (staff_id, pool_id, shift_type, scheduled_start, status, notes)
select tech.id, p.id, 'service_visit', (plan.day || ' ' || plan.start_at || '+10')::timestamptz, 'scheduled', plan.note
from plan
join pools p on p.site_code = plan.site_code
cross join tech
where not exists (
  select 1 from shifts s
  where s.staff_id = tech.id and s.pool_id = p.id
    and s.scheduled_start = (plan.day || ' ' || plan.start_at || '+10')::timestamptz
);

-- What's now rostered for Caleb that week. If this comes back empty, the staff name didn't match:
-- check Admin → Staff for the exact spelling and adjust the 'Caleb' / 'Tansey' line above.
select to_char(s.scheduled_start at time zone 'Australia/Melbourne', 'Dy DD Mon HH24:MI') as start_melb,
       p.name as site, s.notes
from shifts s
join staff st on st.id = s.staff_id
join pools p on p.id = s.pool_id
where st.first_name ilike 'Caleb' and st.last_name ilike 'Tansey'
  and s.scheduled_start >= '2026-09-21 00:00+10' and s.scheduled_start < '2026-09-28 00:00+10'
order by s.scheduled_start;
