-- AquaPro — Senza Dromana: everything, in order. Run once. Safe to re-run.
-- 1. site targets + rounds schema  2. the three baths  3. their numbers  4. their checklists

-- ════════════════════════════════════════════════════════════════
-- add-site-targets-and-rounds-migration.sql
-- ════════════════════════════════════════════════════════════════
--
-- Until now every target lived in code, keyed by pool type. That is why a Senza bath reading
-- 1.6 mg/L free chlorine got no dose recommendation: the generic "leisure" range says 1.0 is the
-- floor, while Senza's training pack says anything under 2.0 is dosed back to 3.0.
--
-- Targets now live per site. A site with no rows here still falls back to the code defaults, so
-- nothing changes for Ace's pools.
--

-- ── 1. Per-site targets ──────────────────────────────────────────────────────
create table if not exists pool_water_targets (
  id           uuid primary key default gen_random_uuid(),
  pool_id      uuid not null references pools(id) on delete cascade,
  parameter    text not null,      -- freeChlorine, totalChlorine, combinedChlorine, ph, totalAlkalinity, ...
  min_value    numeric,            -- below this, dose back toward ideal
  max_value    numeric,            -- above this, act
  ideal_value  numeric,            -- what a dose aims at
  close_below  numeric,            -- below this the body of water is closed
  close_above  numeric,            -- above this the body of water is closed
  unique (pool_id, parameter)
);
create index if not exists idx_pool_water_targets_pool on pool_water_targets(pool_id);

-- ── 2. How a site is dosed ───────────────────────────────────────────────────
-- 'manual' sites have no controller: the operator measures a dose by hand in mL or grams.
alter table pools add column if not exists dosing_type text not null default 'automated';
alter table pools drop constraint if exists pools_dosing_type_check;
alter table pools add constraint pools_dosing_type_check check (dosing_type in ('manual', 'automated'));

-- Fixed doses that must never be calculated. Per the training pack, acid is dosed in fixed steps
-- and capped, because a calculated acid dose in 390 L is how someone pits the stainless.
alter table pools add column if not exists fixed_acid_dose_g numeric;      -- dry acid, grams per dose
alter table pools add column if not exists fixed_acid_max_doses int;       -- then stop and call
alter table pools add column if not exists fixed_soda_ash_dose_g numeric;  -- soda ash, grams per 10 mg/L

-- ── 3. The round structure ───────────────────────────────────────────────────
-- Most sites are one visit a day. Senza is four fixed rounds with a maximum gap.
create table if not exists pool_rounds (
  id           uuid primary key default gen_random_uuid(),
  pool_id      uuid not null references pools(id) on delete cascade,
  round_key    text not null,      -- pre_open, round_2, round_3, close
  label        text not null,
  scheduled_at time not null,
  is_gate      boolean not null default false,   -- the site stays shut until this round passes
  sort_order   int not null default 0,
  unique (pool_id, round_key)
);
create index if not exists idx_pool_rounds_pool on pool_rounds(pool_id);

alter table pools add column if not exists max_round_gap_hours numeric;    -- flag a round that runs late

-- ── 4. What a round record has to carry ──────────────────────────────────────
alter table water_tests add column if not exists round_key text;
alter table water_tests add column if not exists bather_count int;
alter table water_tests add column if not exists clarity_floor_visible boolean;
alter table water_tests add column if not exists calibration_pass boolean;
-- Every dose needs a retest beneath it — the most common reason a record fails an inspection.
alter table water_tests add column if not exists is_retest boolean not null default false;
alter table water_tests add column if not exists retest_of uuid references water_tests(id) on delete set null;
create index if not exists idx_water_tests_retest_of on water_tests(retest_of);

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════
-- seed-senza-dromana-site.sql
-- ════════════════════════════════════════════════════════════════
-- From the build spec (ACE-2026-SEN-TP-001 / LB-001). Tagged to the Senza organisation so their
-- logins see these and nothing else, and Ace sees them because Ace services Senza.
--
--
-- Chill Bunny cold plunge, 390 L each, three separate bodies of water tested and logged
-- separately. Manual dosing only — no controller, no automatic dosing, and ozone is never
-- recorded as a sanitiser.

insert into pools (
  org_id, site_code, name, address, suburb, state, postcode,
  pool_type, sanitiser_type, volume_litres, is_commercial, ph_correction_method, notes
)
select o.id, v.site_code, v.name, '60 Collins Road', 'Dromana', 'VIC', '3936',
       'leisure', 'chlorine', 390, true, 'acid', v.notes
from organisations o
cross join (values
  ('SEN-BATH-1', 'Senza Dromana – Bath 1', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.'),
  ('SEN-BATH-2', 'Senza Dromana – Bath 2', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.'),
  ('SEN-BATH-3', 'Senza Dromana – Bath 3', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.')
) as v(site_code, name, notes)
where o.slug = 'senza-health-club'
  and not exists (select 1 from pools p where p.site_code = v.site_code);

-- Their own task list — Senza's, not Ace's standard one.
insert into site_tasks (org_id, pool_id, label, category, sort_order, photos_required)
select o.id, p.id, v.label, v.category, v.ord, 0
from organisations o
join pools p on p.org_id = o.id and p.site_code like 'SEN-BATH-%'
cross join (values
  ('Check the circulation pump is running',                              'Arrival',         10),
  ('Run the calibration check disc and record the result',               'Arrival',         20),
  ('Take the sample at elbow depth, away from the return',               'Water quality',   30),
  ('Record free and combined chlorine, pH, temperature',                 'Water quality',   40),
  ('Record the bather count',                                            'Water quality',   50),
  ('Confirm the floor is visible (clarity)',                             'Water quality',   60),
  ('Dose if out of range, circulate 15 minutes, then retest and record', 'Chemical dosing', 70),
  ('Record the opening time and operator name',                          'Compliance',      80)
) as v(label, category, ord)
where o.slug = 'senza-health-club'
  and not exists (
    select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active
  );

notify pgrst, 'reload schema';

select p.site_code, p.name, p.volume_litres,
       (select count(*) from site_tasks t where t.pool_id = p.id and t.is_active) as tasks
from pools p join organisations o on o.id = p.org_id
where o.slug = 'senza-health-club' order by p.site_code;

-- ════════════════════════════════════════════════════════════════
-- seed-senza-targets-and-rounds.sql
-- ════════════════════════════════════════════════════════════════
-- ACE-2026-SEN-LB-001 (both v1.0, 27 September 2026).
--
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

-- ════════════════════════════════════════════════════════════════
-- seed-senza-checklists.sql
-- ════════════════════════════════════════════════════════════════
-- Replaces the placeholder list seeded earlier with forms F1 (pre-open), F2 (close of business)
-- and F11 (weekly plant check), worded as the log book has them.

-- Retire the placeholder list
update site_tasks set is_active = false
where pool_id in (select id from pools where site_code like 'SEN-BATH-%')
  and label in (
    'Check the circulation pump is running',
    'Run the calibration check disc and record the result',
    'Take the sample at elbow depth, away from the return',
    'Record free and combined chlorine, pH, temperature',
    'Record the bather count',
    'Confirm the floor is visible (clarity)',
    'Dose if out of range, circulate 15 minutes, then retest and record',
    'Record the opening time and operator name'
  );

insert into site_tasks (org_id, pool_id, label, category, sort_order, photos_required)
select o.id, p.id, v.label, v.category, v.ord, 0
from organisations o
join pools p on p.org_id = o.id and p.site_code like 'SEN-BATH-%'
cross join (values
  -- ── Pre-open (F1) ──────────────────────────────────────────────────────────
  ('Circulation pump running — if it is off, this bath cannot open',            'Pre-open',  10),
  ('Calibration check disc run and recorded — a fail means the baths do not open', 'Pre-open', 20),
  ('Sample taken at elbow depth, away from the return',                          'Pre-open',  30),
  ('Full panel recorded for this bath',                                          'Pre-open',  40),
  ('Dosed if out of target, circulated 15 minutes, retested and recorded',       'Pre-open',  50),
  ('Floor of the bath clearly visible',                                          'Pre-open',  60),
  ('Opening time and operator name recorded',                                    'Pre-open',  70),

  -- ── Close of business, every trading day (F2) ─────────────────────────────
  ('Bath closed to bathers, signage placed',                                     'Close',    110),
  ('Final readings and bather count recorded before draining',                   'Close',    120),
  ('Bath drained completely',                                                    'Close',    130),
  ('Cartridge filter removed, cleaned, refitted',                                'Close',    140),
  ('All wetted surfaces and the waterline scrubbed — non-abrasive pad only',     'Close',    150),
  ('Rinsed thoroughly with mains water',                                         'Close',    160),
  ('Surround, steps and handrails wiped down',                                   'Close',    170),
  ('Refilled to operating level',                                                'Close',    180),
  ('Sodium bicarbonate added — 39 g',                                            'Close',    190),
  ('Circulated 15 minutes',                                                      'Close',    200),
  ('Sodium hypochlorite 12.5% added — 9.4 mL',                                   'Close',    210),
  ('Circulated 15 minutes, full panel tested',                                   'Close',    220),
  ('pH adjusted to 7.3 to 7.6 with dry acid, grams recorded',                    'Close',    230),
  ('Circulation pump left running overnight',                                    'Close',    240),
  ('Weekly deep clean — 1:10 chlorine, 10 minute soak, rinsed (once a week)',    'Close',    250),

  -- ── Weekly plant, equipment and facility check (F11) ──────────────────────
  ('Circulation pump running continuously',                                      'Weekly',   310),
  ('Cartridge filter clean and correctly fitted',                                'Weekly',   320),
  ('No leaks from the bath, hoses or fittings',                                  'Weekly',   330),
  ('Chiller operating and holding setpoint',                                     'Weekly',   340),
  ('Stainless surfaces free of pitting, staining or damage',                     'Weekly',   350),
  ('Waterline and surfaces free of film or biofilm',                             'Weekly',   360),
  ('Drain and refill hoses in good condition, stored clean',                     'Weekly',   370),
  ('Floor surround clean and non-slip',                                          'Weekly',   380),
  ('Steps and handrails secure',                                                 'Weekly',   390),
  ('Signage in place and legible',                                               'Weekly',   400),
  ('Bath closure signs available at the station',                                'Weekly',   410),
  ('Testing station tidy, meter and discs stored dry and within date',           'Weekly',   420),
  ('Measuring cylinders labelled, clean and not interchanged',                   'Weekly',   430),
  ('Room ventilation operating, no excessive condensation',                      'Weekly',   440),
  ('Chemical store locked and inaccessible to members',                          'Weekly',   450),
  ('PPE present and serviceable — goggles, gloves, apron, face shield',          'Weekly',   460),
  ('Acids and chlorine bunded separately, dry acid stored with the acids',       'Weekly',   470)
) as v(label, category, ord)
where o.slug = 'senza-health-club'
  and not exists (select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active);

notify pgrst, 'reload schema';

select t.category, count(*) as tasks
from site_tasks t join pools p on p.id = t.pool_id
where p.site_code = 'SEN-BATH-1' and t.is_active
group by t.category order by min(t.sort_order);

