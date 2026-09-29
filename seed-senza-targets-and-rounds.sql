-- AquaPro — Senza Dromana: the numbers and the routine, from ACE-2026-SEN-TP-001 and
-- ACE-2026-SEN-LB-001 (both v1.0, 27 September 2026).
--
-- Run after add-site-targets-and-rounds-migration.sql and seed-senza-dromana-site.sql.
-- Safe to re-run.
--
-- Acid is dosed in grams of DRY acid and is never calculated: 7 g, maximum two doses, then stop
-- and call Ace on 0422 470 214. Confirmed with Tony 29 Sep 2026 (the training pack said 5 mL in
-- two places, which was a leftover from an earlier draft — dry acid is granular, measured in grams).

-- ── Manual dosing, fixed doses, the four hour rule ───────────────────────────
update pools set
  dosing_type           = 'manual',
  fixed_acid_dose_g     = 7,      -- dry acid, per bath, per dose
  fixed_acid_max_doses  = 2,      -- then stop and call Ace
  fixed_soda_ash_dose_g = 4,      -- per 10 mg/L, per bath
  max_round_gap_hours   = 4
where site_code like 'SEN-BATH-%';

-- ── The targets ──────────────────────────────────────────────────────────────
-- Legal envelope and trading band from "The numbers, on one line" (log book, page 2) and
-- module 5 of the training pack.
insert into pool_water_targets (pool_id, parameter, min_value, max_value, ideal_value, close_below, close_above)
select p.id, v.parameter, v.min_value, v.max_value, v.ideal_value, v.close_below, v.close_above
from pools p
cross join (values
  -- parameter,           min,  max,  ideal, close_below, close_above
  ('freeChlorine',        2.0,  5.0,  3.0,   1.0,         null),   -- legal min 1.0, we run at 3.0
  ('totalChlorine',       null, 6.0,  null,  null,        10.0),   -- legal max 10
  ('combinedChlorine',    null, 0.5,  0.0,   null,        1.0),    -- also closed if above free Cl
  ('ph',                  7.3,  7.6,  7.45,  7.0,         8.0),    -- legal 7.2 to 7.8
  ('totalAlkalinity',     80,   120,  100,   60,          null),   -- correct, do not close
  ('turbidity',           null, 0.5,  0.2,   null,        null)
) as v(parameter, min_value, max_value, ideal_value, close_below, close_above)
where p.site_code like 'SEN-BATH-%'
on conflict (pool_id, parameter) do update set
  min_value = excluded.min_value, max_value = excluded.max_value, ideal_value = excluded.ideal_value,
  close_below = excluded.close_below, close_above = excluded.close_above;

-- ── The four rounds ──────────────────────────────────────────────────────────
-- Trading 09:00 to 20:00. The gap must never exceed four hours while open.
-- Pre-open is a gate: the baths do not open until every one of them is in range.
insert into pool_rounds (pool_id, round_key, label, scheduled_at, is_gate, sort_order)
select p.id, v.round_key, v.label, v.scheduled_at::time, v.is_gate, v.sort_order
from pools p
cross join (values
  ('pre_open', 'Pre-open',      '08:45', true,  10),
  ('round_2',  'Round 2',       '12:45', false, 20),
  ('round_3',  'Round 3',       '16:45', false, 30),
  ('close',    'Close & refill','20:00', false, 40)
) as v(round_key, label, scheduled_at, is_gate, sort_order)
where p.site_code like 'SEN-BATH-%'
on conflict (pool_id, round_key) do update set
  label = excluded.label, scheduled_at = excluded.scheduled_at,
  is_gate = excluded.is_gate, sort_order = excluded.sort_order;

notify pgrst, 'reload schema';

select p.name, p.dosing_type, p.fixed_acid_dose_g || ' g × ' || p.fixed_acid_max_doses as acid,
       (select count(*) from pool_water_targets t where t.pool_id = p.id) as targets,
       (select count(*) from pool_rounds r where r.pool_id = p.id) as rounds
from pools p where p.site_code like 'SEN-BATH-%' order by p.site_code;
