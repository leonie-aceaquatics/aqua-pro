-- AquaPro — AUN Bathhouse dosing changes from Tony, 21 Nov 2026.
--
--   * Chlorine target 6 mg/L at the spa, 3 mg/L at the ice bath. Nothing is done about high
--     chlorine until it goes over 10 mg/L, where the pool closes.
--   * pH is lowered with sodium bisulphate (dry acid), not hydrochloric acid.
--   * No alkalinity or calcium dosing at AUN.
--
-- Run after add-aun-dose-chart.sql. Safe to re-run.

-- ── 1. Chlorine targets ──────────────────────────────────────────────────────
-- Dose when below min, up to ideal. max = close = 10, so anything up to 10 is left alone.
update pool_water_targets t set min_value = v.min_value, ideal_value = v.ideal_value, max_value = 10, close_above = 10
from pools p, (values ('AQ-001-A', 5.0, 6.0), ('AQ-001-B', 2.5, 3.0)) as v(site_code, min_value, ideal_value)
where t.pool_id = p.id and p.site_code = v.site_code and t.parameter = 'freeChlorine';

update pool_water_targets t set max_value = 10, close_above = 10
from pools p
where t.pool_id = p.id and p.site_code in ('AQ-001-A', 'AQ-001-B') and t.parameter = 'totalChlorine';

-- ── 2. Sodium bisulphate in place of hydrochloric acid ───────────────────────
-- Moved to update-aun-volumes-ph.sql, which sets the bisulphate rows for the current volumes.
-- (Inserting them here as well put back the 16,000 L amounts whenever this file was re-run.)

-- ── 3. No alkalinity or calcium dosing ───────────────────────────────────────
delete from pool_dose_chart
where chemical in ('bicarbonate', 'calcium_chloride')
  and pool_id in (select id from pools where site_code in ('AQ-001-A', 'AQ-001-B'));

-- ── 4. Notes ─────────────────────────────────────────────────────────────────
update pools set notes = replace(replace(notes, 'Acid is hydrochloric 33%.', 'pH down is sodium bisulphate (dry acid). No alkalinity or calcium dosing.'),
                                 '39 °C setpoint', '39 °C setpoint, chlorine target 6 mg/L')
where site_code = 'AQ-001-A' and notes not like '%chlorine target%';
update pools set notes = replace(replace(notes, 'Acid is hydrochloric 33%.', 'pH down is sodium bisulphate (dry acid). No alkalinity or calcium dosing.'),
                                 '16 °C setpoint', '16 °C setpoint, chlorine target 3 mg/L')
where site_code = 'AQ-001-B' and notes not like '%chlorine target%';

notify pgrst, 'reload schema';

-- Check: chlorine target and the chart that's left (hypochlorite, bisulphate, salt, super, diarrhoea).
select p.site_code, t.min_value as fc_min, t.ideal_value as fc_target, t.close_above as fc_close,
       (select string_agg(distinct c.chemical || ': ' || c.product, ', ') from pool_dose_chart c where c.pool_id = p.id) as chart
from pools p join pool_water_targets t on t.pool_id = p.id and t.parameter = 'freeChlorine'
where p.site_code in ('AQ-001-A', 'AQ-001-B') order by p.site_code;
