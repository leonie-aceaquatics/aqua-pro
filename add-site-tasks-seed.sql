-- AquaPro — Site Tasks: category column + standard per-visit task list
-- Run AFTER add-site-tasks-migration.sql, then: NOTIFY pgrst, 'reload schema';
-- Safe to re-run: the column add is IF NOT EXISTS and tasks already present are skipped.

alter table site_tasks add column if not exists category text;

-- The standard list, applied to all sites. The "Better Health (Bentleigh East) only" task is
-- attached to that pool if one matches by name; otherwise it falls back to all sites (the
-- label says who it's for either way).
insert into site_tasks (label, category, sort_order, pool_id)
select v.label, v.category, v.ord,
       case when v.label like 'Better Health%'
            then (select id from pools where name ilike '%Better Health%' limit 1)
            else null end
from (values
  ('Sign in on arrival and check site notes', 'Arrival', 10),
  ('Visual check of water clarity and main drain visibility', 'Water quality', 20),
  ('Test free chlorine', 'Water quality', 30),
  ('Test total chlorine and work out combined chlorine', 'Water quality', 40),
  ('Test pH', 'Water quality', 50),
  ('Test total alkalinity', 'Water quality', 60),
  ('Record water temperature', 'Water quality', 70),
  ('Test calcium hardness', 'Water quality', 80),
  ('Test cyanuric acid (outdoor pools where used)', 'Water quality', 90),
  ('Test TDS', 'Water quality', 100),
  ('Run a full SpinTouch test and save results', 'Water quality', 110),
  ('Calculate LSI (Langelier Saturation Index)', 'Water quality', 120),
  ('Compare controller readings to manual test and calibrate if needed', 'Equipment', 130),
  ('Adjust chemicals to bring readings into range', 'Chemical dosing', 140),
  ('Check chlorine and acid drum levels and replace if low', 'Chemical dosing', 150),
  ('Check dosing pumps, tubes and injectors for leaks or blockages', 'Equipment', 160),
  ('Check salt cell and salt level (salt sites)', 'Equipment', 170),
  ('Empty skimmer baskets', 'Cleaning', 180),
  ('Empty pump strainer basket', 'Cleaning', 190),
  ('Check filter pressure and backwash or clean filter if needed', 'Filtration', 200),
  ('Check circulation pump running and no unusual noise', 'Equipment', 210),
  ('Check heater or heat pump operating and set temperature', 'Equipment', 220),
  ('Brush walls and floor', 'Cleaning', 230),
  ('Vacuum pool floor', 'Cleaning', 240),
  ('Clean waterline and scum line', 'Cleaning', 250),
  ('Check water level and top up if needed', 'Water quality', 260),
  ('Check plant room is clean, dry and chemicals stored separately', 'Safety', 270),
  ('Check SDS folder and chemical signage are on site', 'Safety', 280),
  ('Check safety signage, gates and emergency equipment', 'Safety', 290),
  ('Collect microbiological sample for lab testing', 'Compliance', 300),
  ('Record all readings, LSI and chemicals added in the AquaPro app', 'Compliance', 310),
  ('Better Health (Bentleigh East) only: also record readings in the site logbook', 'Compliance', 320),
  ('Flag any out of range results or faults to Tony', 'Compliance', 330),
  ('Take photos of any issues', 'Compliance', 340),
  ('Lock plant room and return keys', 'Departure', 350),
  ('Record stock used in AquaPro and sign out', 'Departure', 360)
) as v(label, category, ord)
where not exists (
  select 1 from site_tasks t where t.label = v.label and t.is_active
);
