-- AquaPro — per-site water targets, manual dosing, and the round structure.
--
-- Until now every target lived in code, keyed by pool type. That is why a Senza bath reading
-- 1.6 mg/L free chlorine got no dose recommendation: the generic "leisure" range says 1.0 is the
-- floor, while Senza's training pack says anything under 2.0 is dosed back to 3.0.
--
-- Targets now live per site. A site with no rows here still falls back to the code defaults, so
-- nothing changes for Ace's pools.
--
-- Safe to re-run.

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
