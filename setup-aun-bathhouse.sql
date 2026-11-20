-- AquaPro — AUN Bathhouse, North Melbourne: its own organisation, its two vessels as manual
-- dosing sites, their targets and the five daily rounds.
-- From ACE-2026-AUN-WQRMP-001 v2.0 (sections 2.2, 4.2, 4.3, CCP1 to CCP5, and the round table).
--
-- Run after add-organisations-migration.sql, add-client-roles-migration.sql and
-- add-site-targets-and-rounds-migration.sql. Safe to re-run.
--
-- Acid and soda ash are left NULL on purpose: the plan says to dose "per the posted chart" and
-- gives no figure, and acid is never calculated. Until Tony sets them, the app tells the operator
-- to use the chart at the dosing point or call Ace.

-- ── 1. The organisation, and Ace's access to it ──────────────────────────────
insert into organisations (name, slug, is_service_provider)
select 'AUN Bathhouse', 'aun-bathhouse', false
where not exists (select 1 from organisations where slug = 'aun-bathhouse');

insert into provider_clients (provider_org_id, client_org_id)
select p.id, c.id from organisations p, organisations c
where p.slug = 'ace-aquatics' and c.slug = 'aun-bathhouse'
on conflict do nothing;

-- ── 2. The two vessels ───────────────────────────────────────────────────────
-- They may already exist from seed-ace-aquatics-pools.sql under Ace; add them if not.
insert into pools (org_id, site_code, name, address, suburb, state, postcode,
                   pool_type, sanitiser_type, volume_litres, is_commercial, notes)
select o.id, v.site_code, v.name, '155 Abbotsford Street', 'North Melbourne', 'VIC', '3051',
       v.pool_type, 'saltwater', v.volume, true, v.notes
from organisations o
cross join (values
  ('AQ-001-A', 'AUN Bathhouse – Hot Spa',       'spa',     16000, ''),
  ('AQ-001-B', 'AUN Bathhouse – Cold Ice Bath', 'leisure', 3000,  '')
) as v(site_code, name, pool_type, volume, notes)
where o.slug = 'aun-bathhouse'
  and not exists (select 1 from pools p where p.site_code = v.site_code);

-- Move them under AUN (water test history moves with them) and make them manual dosing sites.
update pools set
  org_id               = (select id from organisations where slug = 'aun-bathhouse'),
  dosing_type          = 'manual',
  fixed_acid_dose_g    = null,
  fixed_acid_max_doses = null,
  fixed_soda_ash_dose_g = null,
  max_round_gap_hours  = 4,
  volume_litres        = case site_code when 'AQ-001-A' then 16000 else 3000 end,
  notes = case site_code
    when 'AQ-001-A' then 'Hot spa, 16,000 L, 39 °C setpoint (40 °C legal limit). Halo Chlor 35 g/h salt cell plus 12.5% hypochlorite. Manual dosing per the posted chart. Every chlorine reading must come from the SpinTouch, never the Halo display.'
    else                 'Cold ice bath, 3,000 L, 16 °C setpoint. Halo Chlor 35 g/h salt cell. Classed as a swimming pool. Manual dosing per the posted chart. Every chlorine reading must come from the SpinTouch, never the Halo display.'
  end
where site_code in ('AQ-001-A', 'AQ-001-B');

-- ── 3. The targets ───────────────────────────────────────────────────────────
-- min/max/ideal = Ace operating target; close_below/close_above = critical limit (close the vessel).
insert into pool_water_targets (pool_id, parameter, min_value, max_value, ideal_value, close_below, close_above)
select p.id, v.parameter, v.min_value, v.max_value, v.ideal_value, v.close_below, v.close_above
from pools p
join (values
  -- Hot spa (WQRMP 4.2)
  ('AQ-001-A', 'freeChlorine',     3.5,  5.0,  4.0,  3.0,  10.0),  -- legal min 3.0
  ('AQ-001-A', 'totalChlorine',    null, 5.5,  null, null, 10.0),  -- legal max 10
  ('AQ-001-A', 'combinedChlorine', null, 0.3,  0.0,  null, 1.0),   -- closes at 1.0
  ('AQ-001-A', 'ph',               7.4,  7.6,  7.5,  7.2,  7.8),   -- closes outside 7.2 to 7.8
  ('AQ-001-A', 'totalAlkalinity',  100,  120,  110,  60,   null),  -- legal min 60
  ('AQ-001-A', 'calciumHardness',  150,  200,  175,  null, null),
  ('AQ-001-A', 'turbidity',        null, 0.5,  null, null, null),
  -- Cold ice bath (WQRMP 4.3)
  ('AQ-001-B', 'freeChlorine',     3.0,  5.0,  4.0,  1.0,  10.0),  -- legal min 1.0, Ace runs 3.0+
  ('AQ-001-B', 'totalChlorine',    null, 5.5,  null, null, 10.0),
  ('AQ-001-B', 'combinedChlorine', null, 0.3,  0.0,  null, 1.0),
  ('AQ-001-B', 'ph',               7.4,  7.6,  7.5,  7.2,  7.8),
  ('AQ-001-B', 'totalAlkalinity',  120,  150,  135,  60,   null),  -- higher than the spa for LSI at 16 °C
  ('AQ-001-B', 'calciumHardness',  250,  300,  275,  null, null),
  ('AQ-001-B', 'turbidity',        null, 0.5,  null, null, null)
) as v(site_code, parameter, min_value, max_value, ideal_value, close_below, close_above)
  on v.site_code = p.site_code
on conflict (pool_id, parameter) do update set
  min_value = excluded.min_value, max_value = excluded.max_value, ideal_value = excluded.ideal_value,
  close_below = excluded.close_below, close_above = excluded.close_above;

-- ── 4. The five rounds ───────────────────────────────────────────────────────
-- Trading 6:00 am to 10:30 pm, seven days. Ace does the pre-open round, AUN staff the rest.
-- Pre-open is a gate: neither vessel opens until it passes.
insert into pool_rounds (pool_id, round_key, label, scheduled_at, is_gate, sort_order)
select p.id, v.round_key, v.label, v.scheduled_at::time, v.is_gate, v.sort_order
from pools p
cross join (values
  ('pre_open', 'Pre-open (Ace)', '05:45', true,  10),
  ('round_2',  'Round 2',        '10:00', false, 20),
  ('round_3',  'Round 3',        '14:00', false, 30),
  ('round_4',  'Round 4',        '18:00', false, 40),
  ('close',    'Close',          '22:00', false, 50)
) as v(round_key, label, scheduled_at, is_gate, sort_order)
where p.site_code in ('AQ-001-A', 'AQ-001-B')
on conflict (pool_id, round_key) do update set
  label = excluded.label, scheduled_at = excluded.scheduled_at,
  is_gate = excluded.is_gate, sort_order = excluded.sort_order;

-- ── 5. Their own task list ───────────────────────────────────────────────────
insert into site_tasks (org_id, pool_id, label, category, sort_order, photos_required)
select p.org_id, p.id, v.label, v.category, v.ord, 0
from pools p
cross join (values
  ('Check the circulation pump is running and the Halo has no alarms',            'Arrival',         10),
  ('Test free and total chlorine and pH on the SpinTouch (not the Halo display)', 'Water quality',   20),
  ('Read the temperature with the thermometer at the vessel',                     'Water quality',   30),
  ('Record the bather count',                                                     'Water quality',   40),
  ('Confirm the floor is clearly visible',                                        'Water quality',   50),
  ('If out of range, dose per the posted chart, circulate one turnover, retest',  'Chemical dosing', 60),
  ('If a critical limit is breached, close the vessel and call Ace on 0422 470 214', 'Compliance',   70),
  ('Record the round time and operator name',                                     'Compliance',      80)
) as v(label, category, ord)
where p.site_code in ('AQ-001-A', 'AQ-001-B')
  and not exists (
    select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active
  );

notify pgrst, 'reload schema';

-- Check: both vessels under AUN, manual, with targets, rounds and tasks.
select p.site_code, p.name, o.name as organisation, p.dosing_type, p.volume_litres,
       (select count(*) from pool_water_targets t where t.pool_id = p.id) as targets,
       (select count(*) from pool_rounds r where r.pool_id = p.id)        as rounds,
       (select count(*) from site_tasks s where s.pool_id = p.id and s.is_active) as tasks
from pools p join organisations o on o.id = p.org_id
where p.site_code in ('AQ-001-A', 'AQ-001-B') order by p.site_code;
