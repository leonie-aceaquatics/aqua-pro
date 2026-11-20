-- AquaPro — AUN Bathhouse, second round of changes from Tony (21 Nov 2026).
--
--   * Volumes: hot spa 11,000 L (was 16,000), ice bath 2,900 L (was 3,000).
--   * pH target 7.4 on both. Dose when outside 7.3 to 7.5, to bring it to 7.4.
--   * Sodium carbonate is on site, so low pH gets a dose instead of "no soda ash".
--   * The whole posted chart is rebuilt for the new volumes.
--
-- Run after update-aun-dosing.sql. Safe to re-run.

-- ── 1. Volumes ───────────────────────────────────────────────────────────────
update pools set volume_litres = 11000 where site_code = 'AQ-001-A';
update pools set volume_litres = 2900  where site_code = 'AQ-001-B';

-- ── 2. pH target 7.4 ─────────────────────────────────────────────────────────
-- Closure limits stay at 7.2 and 7.8.
update pool_water_targets t set min_value = 7.3, max_value = 7.5, ideal_value = 7.4
from pools p
where t.pool_id = p.id and p.site_code in ('AQ-001-A', 'AQ-001-B') and t.parameter = 'ph';

-- ── 3. The chart, for the new volumes ────────────────────────────────────────
-- Liquid chlorine 12.5%: volume ÷ 125 mL per 1 mg/L       (spa 88 mL, ice bath 23 mL)
-- Sodium bisulphate:      ~8.5 g per 1,000 L per 0.1 pH    (spa 95 g, ice bath 25 g)
-- Sodium carbonate:       ~7.5 g per 1,000 L per 0.1 pH    (spa 85 g, ice bath 22 g)
-- Superchlorination is to 10 × the combined chlorine; diarrhoea and salt scale with volume.
-- The app goes in a straight line between rows, so any reading gets an exact amount.
delete from pool_dose_chart
where pool_id in (select id from pools where site_code in ('AQ-001-A', 'AQ-001-B'));

insert into pool_dose_chart (pool_id, chemical, product, step, amount, unit, plain_terms)
select p.id, v.chemical, v.product, v.step, v.amount, v.unit, v.plain_terms
from pools p
join (values
  -- HOT SPA — 11,000 litres
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%',          0.5,  44,   'mL', null),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%',          1.0,  88,   'mL', null),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%',          2.0,  176,  'mL', null),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%',          3.0,  264,  'mL', null),
  ('AQ-001-A', 'hypochlorite',      'Liquid chlorine 12.5%',          5.0,  440,  'mL', null),
  ('AQ-001-A', 'acid',              'Sodium bisulphate (dry acid)',   0.1,  95,   'g',  null),
  ('AQ-001-A', 'acid',              'Sodium bisulphate (dry acid)',   0.2,  190,  'g',  null),
  ('AQ-001-A', 'acid',              'Sodium bisulphate (dry acid)',   0.4,  375,  'g',  null),
  ('AQ-001-A', 'soda_ash',          'Sodium carbonate (soda ash)',    0.1,  85,   'g',  null),
  ('AQ-001-A', 'soda_ash',          'Sodium carbonate (soda ash)',    0.2,  165,  'g',  null),
  ('AQ-001-A', 'soda_ash',          'Sodium carbonate (soda ash)',    0.4,  330,  'g',  null),
  ('AQ-001-A', 'salt',              'Pool salt',                      1000, 11,   'kg', 'add slowly, brush through'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%',          0.5,  440,  'mL', 'combined chlorine reading 0.5'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%',          0.8,  705,  'mL', 'combined chlorine reading 0.8'),
  ('AQ-001-A', 'superchlorination', 'Liquid chlorine 12.5%',          1.0,  880,  'mL', 'combined chlorine reading 1.0'),
  ('AQ-001-A', 'diarrhoea',         'Liquid chlorine 12.5%',          20,   1445, 'mL', '20 mg/L held 13 hours. Call Ace first.'),
  -- COLD ICE BATH — 2,900 litres
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%',          0.5,  12,   'mL', null),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%',          1.0,  23,   'mL', null),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%',          2.0,  46,   'mL', null),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%',          3.0,  70,   'mL', null),
  ('AQ-001-B', 'hypochlorite',      'Liquid chlorine 12.5%',          5.0,  116,  'mL', null),
  ('AQ-001-B', 'acid',              'Sodium bisulphate (dry acid)',   0.1,  25,   'g',  null),
  ('AQ-001-B', 'acid',              'Sodium bisulphate (dry acid)',   0.2,  50,   'g',  null),
  ('AQ-001-B', 'acid',              'Sodium bisulphate (dry acid)',   0.4,  100,  'g',  null),
  ('AQ-001-B', 'soda_ash',          'Sodium carbonate (soda ash)',    0.1,  22,   'g',  null),
  ('AQ-001-B', 'soda_ash',          'Sodium carbonate (soda ash)',    0.2,  44,   'g',  null),
  ('AQ-001-B', 'soda_ash',          'Sodium carbonate (soda ash)',    0.4,  88,   'g',  null),
  ('AQ-001-B', 'salt',              'Pool salt',                      1000, 2.9,  'kg', 'add slowly, brush through'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%',          0.5,  116,  'mL', 'combined chlorine reading 0.5'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%',          0.8,  186,  'mL', 'combined chlorine reading 0.8'),
  ('AQ-001-B', 'superchlorination', 'Liquid chlorine 12.5%',          1.0,  232,  'mL', 'combined chlorine reading 1.0'),
  ('AQ-001-B', 'diarrhoea',         'Liquid chlorine 12.5%',          20,   387,  'mL', '20 mg/L held 13 hours. Call Ace first.')
) as v(site_code, chemical, product, step, amount, unit, plain_terms)
  on v.site_code = p.site_code;

-- ── 4. Notes ─────────────────────────────────────────────────────────────────
update pools set notes = replace(replace(replace(notes, '16,000 L', '11,000 L'), '3,000 L', '2,900 L'),
                                 'pH down is sodium bisulphate (dry acid).', 'pH target 7.4: down with sodium bisulphate, up with sodium carbonate.')
where site_code in ('AQ-001-A', 'AQ-001-B');

notify pgrst, 'reload schema';

-- Check: volume, pH target, and 16 chart rows per vessel.
select p.site_code, p.volume_litres, t.ideal_value as ph_target,
       (select count(*) from pool_dose_chart c where c.pool_id = p.id) as chart_rows
from pools p join pool_water_targets t on t.pool_id = p.id and t.parameter = 'ph'
where p.site_code in ('AQ-001-A', 'AQ-001-B') order by p.site_code;
