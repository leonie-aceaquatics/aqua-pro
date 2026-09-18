-- AquaPro — Splash pad sites (Tony's site visit list)
-- Adds a splash_pad pool type, lets site tasks target a pool TYPE (not just one pool or all),
-- and seeds the splash pad checks. Run after add-site-stock-migration.sql.

-- 1. splash_pad pool type
alter table pools drop constraint if exists pools_pool_type_check;
alter table pools add constraint pools_pool_type_check
  check (pool_type in ('indoor', 'outdoor', 'spa', 'wading', 'hydrotherapy', 'leisure', 'splash_pad'));

-- 1b. the splash pad sites
update pools set pool_type = 'splash_pad'
where name ilike 'Warburton Water World%'
   or name ilike 'Seville Water Play Park%'
   or name ilike 'Olinda Splash Pad%'
   or name ilike 'Lilydale Splash Pad%';

-- 2. site tasks can apply to every pool of a type (pool_id null + pool_type set)
alter table site_tasks add column if not exists pool_type text;
create index if not exists idx_site_tasks_pool_type on site_tasks(pool_type);

-- 3. splash pad visit checks — shown at every pool whose type is splash_pad, on top of the all-sites list
insert into site_tasks (label, category, sort_order, pool_type)
select v.label, v.category, v.ord, 'splash_pad'
from (values
  ('Open plant room',                                                       'Arrival',    12),
  ('Check splash pad for graffiti or damage',                               'Arrival',    14),
  ('Turn splash park on and check all features are working',               'Equipment',  16),
  ('Check switchboard for alarms',                                          'Equipment',  122),
  ('Check Chemtrol for alarms',                                             'Equipment',  124),
  ('Check water tank level',                                                'Equipment',  126),
  ('Check circulation pump flow rate',                                      'Filtration', 205),
  ('Check filtration pressure gauge',                                       'Filtration', 206)
) as v(label, category, ord)
where not exists (select 1 from site_tasks t where t.label = v.label and t.is_active);

-- 4. water tests: which chemicals were added and any fault are recorded on the test itself
alter table water_tests add column if not exists fault_report text;

notify pgrst, 'reload schema';
