-- AquaPro — Tahi's standard run, Monday to Friday, skipping Victorian public holidays.
-- To roster another week: change week_start (a Monday), list any public holidays that week,
-- and list the days Embassy is on (blank = not this week). Then run. Safe to re-run.
-- All staff start 4:30 am; later times are ORDER only — Tahi taps Start / Finish on site for hours.

with params as (
  select date '2026-09-21' as week_start                              -- ← the Monday of the week
),
holidays(day) as (values
  (date '2026-09-25')                                                 -- ← Fri 25 Sep: Grand Final Friday (VIC)
),
embassy_days(day) as (values
  (date '2026-09-22'), (date '2026-09-23'), (date '2026-09-24')       -- ← Tue / Wed / Thu this week
),
tech as (
  select id from staff where first_name ilike 'Tahi%' and is_active order by last_name limit 1
),
-- The standard run: every working day, in this order. Times are a guide for order only.
run(site_pattern, start_at, note) as (values
  ('%St Kevin%',                 '04:30', null),
  ('%Acacia Place Eden%',        '05:30', null),
  ('%Haven%Outdoor%',            '06:00', null),
  ('%Haven%Spa%',                '06:01', null),
  ('%Collingwood%Spa%',          '07:00', null),
  ('%Collingwood%Cold%',         '07:01', null),
  ('%Collingwood%Lap%',          '07:02', null),
  ('%AAMI%Hot Spa%',             '08:00', null),
  ('%AAMI%Cold%',                '08:01', null),
  ('%AAMI%Lap%',                 '08:02', null),
  ('%AAMI%Gym%',                 '08:30', null),
  ('%Tennis%Plant Room 1%',      '09:00', null),
  ('%Tennis%Plant Room 2%',      '09:01', null),
  ('%Peppers%',                  '10:00', null),
  ('%Moonee Ponds%',             '11:00', null)
),
-- Extras on particular days only
extras(day, site_pattern, start_at, note) as (
  select day, '%Embassy%', '05:00', 'Pool is on level 7 in the Chinese garden' from embassy_days
),
workdays as (
  select (week_start + n)::date as day
  from params, generate_series(0, 4) as n                             -- Mon..Fri
  where (week_start + n)::date not in (select day from holidays)
),
plan as (
  select w.day, r.site_pattern, r.start_at, r.note from workdays w cross join run r
  union all
  select e.day, e.site_pattern, e.start_at, e.note from extras e
)
insert into shifts (staff_id, pool_id, shift_type, scheduled_start, status, notes)
select tech.id, p.id, 'service_visit', (plan.day::text || ' ' || plan.start_at || '+10')::timestamptz, 'scheduled', plan.note
from plan
join lateral (select id from pools where name ilike plan.site_pattern order by name limit 1) p on true
cross join tech
where not exists (
  select 1 from shifts s
  where s.staff_id = tech.id and s.pool_id = p.id and s.scheduled_start::date = plan.day
);

-- Check. Expect 15 sites × 4 days + Embassy × 3 = 63 rows this week (fewer if a site name didn't match).
select to_char(s.scheduled_start at time zone 'Australia/Melbourne', 'Dy DD Mon HH24:MI') as start_melb,
       p.name as site, s.notes
from shifts s
join staff st on st.id = s.staff_id
join pools p on p.id = s.pool_id
where st.first_name ilike 'Tahi%'
  and s.scheduled_start >= '2026-09-21 00:00+10' and s.scheduled_start < '2026-09-28 00:00+10'   -- ← same week as week_start
order by s.scheduled_start;
