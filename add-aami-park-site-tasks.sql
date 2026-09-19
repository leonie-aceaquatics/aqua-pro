-- AquaPro — AAMI Park site tasks from Tony (2026-09-19)
-- Run AFTER add-facility-sites-and-task-photos-migration.sql. Safe to re-run.
--
-- The gym is its own site ("AAMI Park – Gym", AQ-007-G, type facility) so it has only gym tasks
-- and no water-test / plant-room screens. Pool tasks go on all three bodies of water
-- (AQ-007-A hot spa, -B cold plunge, -C lap pool) so the list shows whichever one the tech opens.
--
-- NOT added because the standard all-sites list already covers them:
--   Plant room checks            → "Check plant room is clean, dry…" + the Plant Room Log
--   Stock take each visit        → "Count chemical stock on site and record it in AquaPro"
--   Circulation pump checks      → "Check circulation pump running and no unusual noise"
--   Record temperature per pool  → "Record water temperature" (shows for each body of water)
--   LSI weekly                   → "Calculate LSI" — the app works it out on every test
--   Check dosing machine         → "Check dosing pumps, tubes and injectors for leaks or blockages"
--   Vacuum spa / cold / lap      → "Vacuum pool floor" + "Brush walls and floor" (per body of water)

-- ── The gym as a site ─────────────────────────────────────────────────────────
insert into pools (site_code, name, address, suburb, state, postcode, pool_type, sanitiser_type, is_commercial, notes)
select 'AQ-007-G', 'AAMI Park – Gym', 'Olympic Boulevard', 'Melbourne', 'VIC', '3000', 'facility', 'chlorine', true,
       'Gym clean with before/after photos. Not a body of water — no water testing.'
where not exists (select 1 from pools where site_code = 'AQ-007-G');

insert into site_tasks (label, category, sort_order, photos_required, pool_id)
select v.label, v.category, v.ord, v.photos, p.id
from pools p
cross join (values
  ('Take 3 BEFORE photos of the gym',           'Arrival',   10, 3),
  ('Gym cleaned',                               'Cleaning',  20, 0),
  ('Take 3 AFTER photos of the gym',            'Cleaning',  30, 3),
  ('Sign out and report anything damaged',      'Departure', 40, 0)
) as v(label, category, ord, photos)
where p.site_code = 'AQ-007-G'
  and not exists (select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active);

-- ── Pool-side tasks, on each AAMI body of water ───────────────────────────────
insert into site_tasks (label, category, sort_order, photos_required, pool_id)
select v.label, v.category, v.ord, v.photos, p.id
from pools p
cross join (values
  ('Check sodium bisulphate tank level and top up if low',                                'Chemical dosing', 152, 0),
  ('Check ProCal dosing controller: readings sensible, no alarms, pumps dosing',           'Equipment',       162, 0),
  ('Record filter pressures: spa (hot), cold plunge, and lap pool filters 1, 2 and 3',    'Filtration',      202, 0),
  ('Check UV system: lamps running, no alarms',                                            'Equipment',       212, 0),
  ('Check MechMate: status and alarms',                                                    'Equipment',       214, 0),
  ('Check CO2 system: cylinder level, regulator, no leaks or alarms',                      'Equipment',       216, 0),
  ('Pool deck cleaned and equipment put away',                                             'Cleaning',        255, 1),
  ('Complete the Plant Room Log in AquaPro',                                               'Compliance',      312, 0)
) as v(label, category, ord, photos)
where p.site_code in ('AQ-007-A', 'AQ-007-B', 'AQ-007-C')
  and not exists (select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active);

select p.name, t.sort_order, t.category, t.label, t.photos_required
from site_tasks t join pools p on p.id = t.pool_id
where p.site_code like 'AQ-007-%' and t.is_active
order by p.site_code, t.sort_order;
