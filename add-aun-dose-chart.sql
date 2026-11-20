-- AquaPro — AUN Bathhouse's posted dose chart, retest waits and temperature limits.
-- From ACE-2026-AUN-TRAIN-001 (TD-3 Manual Dosing Charts) and the Site Log Book quick reference.
--
-- Run after setup-aun-bathhouse.sql. Safe to re-run.
--
-- The app reads these rows instead of working a dose out, so what staff see on the phone is
-- what is posted at the dosing point. Acid is a lookup of the posted rows, never a formula.

-- ── 1. How long to wait before the retest (one full turnover) ───────────────
alter table pools add column if not exists retest_wait_minutes int;
update pools set retest_wait_minutes = 60 where site_code = 'AQ-001-A';   -- spa: 60 minutes
update pools set retest_wait_minutes = 25 where site_code = 'AQ-001-B';   -- ice bath: 25 minutes

-- ── 2. The posted dose chart ─────────────────────────────────────────────────
-- step = how much the reading moves (mg/L, or pH units for acid); amount = what to add for it.
create table if not exists pool_dose_chart (
  id           uuid primary key default gen_random_uuid(),
  pool_id      uuid not null references pools(id) on delete cascade,
  chemical     text not null check (chemical in
                 ('hypochlorite', 'acid', 'bicarbonate', 'calcium_chloride', 'salt',
                  'soda_ash', 'thiosulphate', 'superchlorination', 'diarrhoea')),
  product      text not null,      -- as written on the chart and the drum
  step         numeric not null,
  amount       numeric not null,
  unit         text not null,      -- mL, g, kg, L
  plain_terms  text,               -- "half a cup"
  unique (pool_id, chemical, step)
);
create index if not exists idx_pool_dose_chart_pool on pool_dose_chart(pool_id);

insert into pool_dose_chart (pool_id, chemical, product, step, amount, unit, plain_terms)
select p.id, v.chemical, v.product, v.step, v.amount, v.unit, v.plain_terms
from pools p
join (values
  -- HOT SPA — 16,000 litres
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%', 0.5,  65,   'mL', 'a quarter cup'),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%', 1.0,  130,  'mL', 'half a cup'),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%', 2.0,  260,  'mL', '1 cup'),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%', 3.0,  390,  'mL', '1½ cups'),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%', 5.0,  650,  'mL', '2½ cups'),
  ('AQ-001-A', 'acid',              'Hydrochloric acid 33%', 0.1,  100,  'mL', 'a third of a cup'),
  ('AQ-001-A', 'acid',              'Hydrochloric acid 33%', 0.2,  200,  'mL', 'most of a cup'),
  ('AQ-001-A', 'acid',              'Hydrochloric acid 33%', 0.4,  400,  'mL', '1½ cups'),
  ('AQ-001-A', 'bicarbonate',       'Sodium bicarbonate',    10,   225,  'g',  'about 1 cup'),
  ('AQ-001-A', 'calcium_chloride',  'Calcium chloride',      10,   230,  'g',  'about 1 cup'),
  ('AQ-001-A', 'salt',              'Pool salt',             1000, 16,   'kg', 'add slowly, brush through'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%', 0.5,  650,  'mL', 'combined chlorine reading 0.5'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%', 0.8,  1050, 'mL', 'combined chlorine reading 0.8'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%', 1.0,  1300, 'mL', 'combined chlorine reading 1.0'),
  ('AQ-001-A', 'diarrhoea',         'Liquid chlorine 12.5%', 20,   2100, 'mL', '20 mg/L held 13 hours. Call Ace first.'),
  -- COLD ICE BATH — 3,000 litres
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%', 0.5,  12,   'mL', 'a tablespoon'),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%', 1.0,  25,   'mL', 'two tablespoons'),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%', 2.0,  50,   'mL', 'a fifth of a cup'),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%', 3.0,  75,   'mL', 'a third of a cup'),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%', 5.0,  125,  'mL', 'half a cup'),
  ('AQ-001-B', 'acid',              'Hydrochloric acid 33%', 0.1,  20,   'mL', 'a tablespoon'),
  ('AQ-001-B', 'acid',              'Hydrochloric acid 33%', 0.2,  40,   'mL', 'two tablespoons'),
  ('AQ-001-B', 'acid',              'Hydrochloric acid 33%', 0.4,  75,   'mL', 'a third of a cup'),
  ('AQ-001-B', 'bicarbonate',       'Sodium bicarbonate',    10,   42,   'g',  'two heaped tbsp'),
  ('AQ-001-B', 'calcium_chloride',  'Calcium chloride',      10,   44,   'g',  'two heaped tbsp'),
  ('AQ-001-B', 'salt',              'Pool salt',             1000, 3,    'kg', 'add slowly, brush through'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%', 0.5,  125,  'mL', 'combined chlorine reading 0.5'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%', 0.8,  200,  'mL', 'combined chlorine reading 0.8'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%', 1.0,  250,  'mL', 'combined chlorine reading 1.0'),
  ('AQ-001-B', 'diarrhoea',         'Liquid chlorine 12.5%', 20,   400,  'mL', '20 mg/L held 13 hours. Call Ace first.')
) as v(site_code, chemical, product, step, amount, unit, plain_terms)
  on v.site_code = p.site_code
on conflict (pool_id, chemical, step) do update set
  product = excluded.product, amount = excluded.amount, unit = excluded.unit, plain_terms = excluded.plain_terms;

-- ── 3. Temperature closure limits ────────────────────────────────────────────
-- Close-only rows: spa at or above 40 °C (r. 52), ice bath below 8 °C.
insert into pool_water_targets (pool_id, parameter, min_value, max_value, ideal_value, close_below, close_above)
select p.id, 'temperature', null, null, v.ideal, v.close_below, v.close_above
from pools p
join (values ('AQ-001-A', 39, null::numeric, 39.9), ('AQ-001-B', 16, 8, null)) as v(site_code, ideal, close_below, close_above)
  on v.site_code = p.site_code
on conflict (pool_id, parameter) do update set
  ideal_value = excluded.ideal_value, close_below = excluded.close_below, close_above = excluded.close_above;

-- ── 4. Notes and the dosing task, now the chart is known ─────────────────────
update pools set notes = case site_code
  when 'AQ-001-A' then 'Hot spa, 16,000 L, 39 °C setpoint (close at 40 °C). Max 15 bathers. Halo Chlor 35 g/h salt cell plus 12.5% hypochlorite pump. Acid is hydrochloric 33%. Dosed by hand from the posted chart (TD-3). Wait 60 minutes before the retest. Every chlorine reading must come from the SpinTouch, never the Halo display.'
  else                 'Cold ice bath, 3,000 L, 16 °C setpoint (close below 8 °C). Max 4 bathers. Halo Chlor 35 g/h salt cell. Acid is hydrochloric 33%. Dosed by hand from the posted chart (TD-3). Wait 25 minutes before the retest. Every chlorine reading must come from the SpinTouch, never the Halo display.'
end
where site_code in ('AQ-001-A', 'AQ-001-B');

update site_tasks set label = 'If out of range: pump running, pool clear, dose per the chart, wait one turnover (spa 60 min, ice bath 25 min), retest'
where label = 'If out of range, dose per the posted chart, circulate one turnover, retest'
  and pool_id in (select id from pools where site_code in ('AQ-001-A', 'AQ-001-B'));

notify pgrst, 'reload schema';

-- Check: 15 chart rows per vessel, the wait time, and the temperature row.
select p.site_code, p.retest_wait_minutes,
       (select count(*) from pool_dose_chart c where c.pool_id = p.id) as chart_rows,
       (select close_above from pool_water_targets t where t.pool_id = p.id and t.parameter = 'temperature') as close_above_c,
       (select close_below from pool_water_targets t where t.pool_id = p.id and t.parameter = 'temperature') as close_below_c
from pools p where p.site_code in ('AQ-001-A', 'AQ-001-B') order by p.site_code;
