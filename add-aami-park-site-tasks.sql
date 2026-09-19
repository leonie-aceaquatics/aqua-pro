-- AquaPro — AAMI Park site tasks from Tony (2026-09-19)
-- Attached to all three AAMI Park bodies of water (AQ-007-A hot spa, -B cold plunge, -C lap pool)
-- so the list shows whichever one the technician opens. Safe to re-run: existing labels are skipped.
--
-- NOT added because the standard all-sites list already covers them:
--   Plant room checks            → "Check plant room is clean, dry…" + the Plant Room Log
--   Stock take each visit        → "Count chemical stock on site and record it in AquaPro"
--   Circulation pump checks      → "Check circulation pump running and no unusual noise"
--   Record temperature per pool  → "Record water temperature" (shows for each body of water)
--   LSI weekly                   → "Calculate LSI" — the app works it out on every test, so it's better than weekly
--   Check dosing machine         → "Check dosing pumps, tubes and injectors for leaks or blockages"
--   Vacuum spa / cold / lap      → "Vacuum pool floor" + "Brush walls and floor" (shows for each body of water)

insert into site_tasks (label, category, sort_order, pool_id)
select v.label, v.category, v.ord, p.id
from pools p
cross join (values
  ('Check sodium bisulphate tank level and top up if low',                                          'Chemical dosing', 152),
  ('Check ProCal dosing controller: readings sensible, no alarms, pumps dosing',                     'Equipment',       162),
  ('Record filter pressures: spa (hot), cold plunge, and lap pool filters 1, 2 and 3',              'Filtration',      202),
  ('Check UV system: lamps running, no alarms',                                                      'Equipment',       212),
  ('Check MechMate: status and alarms',                                                              'Equipment',       214),
  ('Check CO2 system: cylinder level, regulator, no leaks or alarms',                                'Equipment',       216),
  ('Gym clean — take 3 BEFORE photos first (add them to today''s Plant Room Log photos)',           'Cleaning',        226),
  ('Gym clean completed',                                                                            'Cleaning',        227),
  ('Gym clean — take 3 AFTER photos (add them to today''s Plant Room Log photos)',                  'Cleaning',        228),
  ('Pool deck cleaned and equipment put away — take 1 photo',                                        'Cleaning',        255),
  ('Complete the Plant Room Log in AquaPro',                                                         'Compliance',      312)
) as v(label, category, ord)
where p.site_code in ('AQ-007-A', 'AQ-007-B', 'AQ-007-C')
  and not exists (
    select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active
  );

select p.name, t.sort_order, t.category, t.label
from site_tasks t join pools p on p.id = t.pool_id
where p.site_code like 'AQ-007-%' and t.is_active
order by p.site_code, t.sort_order;
