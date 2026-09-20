-- AquaPro — Seville Water Play Park tasks from Tony (2026-09-20)
-- Safe to re-run. Seville is site_code AQ-017-A (matched by name below in case the code differs).
--
-- NOT added because the splash-pad list (every splash pad) or the all-sites list already has them:
--   Check chlorine tank              → "Check chlorine and acid drum levels and replace if low"
--   Check main switchboard / errors  → "Check switchboard for alarms" + "Flag any out of range results or faults to Tony"
--   Check water tank level           → "Check water tank level"
--   Activate + assess full function  → "Turn splash park on and check all features are working"
--   Check the Chemtrol unit          → "Check Chemtrol for alarms"

-- Filter pressure target applies to every splash pad, so the shared splash-pad task gets the number
update site_tasks
set label = 'Check filter pressure gauges 1 and 2 (should be about 100 kPa)'
where label = 'Check filtration pressure gauge' and pool_type = 'splash_pad' and is_active;

insert into site_tasks (label, category, sort_order, pool_id)
select v.label, v.category, v.ord, p.id
from (select id from pools where name ilike '%Seville%' limit 1) p
cross join (values
  ('Check sodium bisulphate tank level and top up if low',                                     'Chemical dosing', 152),
  ('Check UV system: record % output and lamp run hours in the water test (UV System boxes)',  'Equipment',       128),
  ('Check all 4 water feature pumps for alarms',                                               'Equipment',       130),
  ('Set the splash park operating times on the controller for the season / day',              'Equipment',       18)
) as v(label, category, ord)
where not exists (select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active);

select t.sort_order, t.category, t.label, coalesce(p.name, case when t.pool_type is not null then 'All ' || t.pool_type || 's' else 'All sites' end) as applies_to
from site_tasks t left join pools p on p.id = t.pool_id
where t.is_active and (t.pool_id is null or t.pool_type = 'splash_pad' or p.name ilike '%Seville%')
order by t.sort_order;
