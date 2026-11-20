-- AquaPro — AUN hot spa is 10,000 L (was 11,000). Run after update-aun-volumes-ph.sql.
-- Rebuilds the spa's chart for the new volume, at the same rates. Safe to re-run.
--   Liquid chlorine 12.5%: 80 mL per 1 mg/L   Sodium bisulphate: 85 g per 0.1 pH
--   Sodium carbonate: 75 g per 0.1 pH

update pools set volume_litres = 10000 where site_code = 'AQ-001-A';

delete from pool_dose_chart where pool_id in (select id from pools where site_code = 'AQ-001-A');

insert into pool_dose_chart (pool_id, chemical, product, step, amount, unit, plain_terms)
select p.id, v.chemical, v.product, v.step, v.amount, v.unit, v.plain_terms
from pools p
join (values
  ('hypochlorite',      'Liquid chlorine 12.5%',          0.5,  40,   'mL', null),
  ('hypochlorite',      'Liquid chlorine 12.5%',          1.0,  80,   'mL', null),
  ('hypochlorite',      'Liquid chlorine 12.5%',          2.0,  160,  'mL', null),
  ('hypochlorite',      'Liquid chlorine 12.5%',          3.0,  240,  'mL', null),
  ('hypochlorite',      'Liquid chlorine 12.5%',          5.0,  400,  'mL', null),
  ('acid',              'Sodium bisulphate (dry acid)',   0.1,  85,   'g',  null),
  ('acid',              'Sodium bisulphate (dry acid)',   0.2,  170,  'g',  null),
  ('acid',              'Sodium bisulphate (dry acid)',   0.4,  340,  'g',  null),
  ('soda_ash',          'Sodium carbonate (soda ash)',    0.1,  75,   'g',  null),
  ('soda_ash',          'Sodium carbonate (soda ash)',    0.2,  150,  'g',  null),
  ('soda_ash',          'Sodium carbonate (soda ash)',    0.4,  300,  'g',  null),
  ('salt',              'Pool salt',                      1000, 10,   'kg', 'add slowly, brush through'),
  ('superchlorination', 'Liquid chlorine 12.5%',          0.5,  400,  'mL', 'combined chlorine reading 0.5'),
  ('superchlorination', 'Liquid chlorine 12.5%',          0.8,  640,  'mL', 'combined chlorine reading 0.8'),
  ('superchlorination', 'Liquid chlorine 12.5%',          1.0,  800,  'mL', 'combined chlorine reading 1.0'),
  ('diarrhoea',         'Liquid chlorine 12.5%',          20,   1315, 'mL', '20 mg/L held 13 hours. Call Ace first.')
) as v(chemical, product, step, amount, unit, plain_terms) on p.site_code = 'AQ-001-A';

update pools set notes = replace(replace(notes, '11,000 L', '10,000 L'), '16,000 L', '10,000 L')
where site_code = 'AQ-001-A';

notify pgrst, 'reload schema';

-- Check: 10000 and 16 rows; 80 mL chlorine per 1 mg/L.
select p.site_code, p.volume_litres,
       (select count(*) from pool_dose_chart c where c.pool_id = p.id) as chart_rows,
       (select amount from pool_dose_chart c where c.pool_id = p.id and c.chemical = 'hypochlorite' and c.step = 1.0) as chlorine_ml_per_1
from pools p where p.site_code = 'AQ-001-A';
