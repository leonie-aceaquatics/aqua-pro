-- AquaPro — load chemical cost rates from the Aquachem Platinum list (trade, ex GST).
-- Run add-chemical-pricing-migration.sql FIRST. See docs/chemical-costs.md for the workings.
--
-- Both columns are per DOSE unit (the litre or kilo a dose is recorded in) and ex GST.
-- Matching is by name, so a chemical whose name does not look like the pattern is left alone
-- rather than priced wrongly. The last query shows you exactly what was and was not matched.

-- ── 1. cost: what Ace pays ──────────────────────────────────────────────────────────────────
with price(pattern, cost) as (values
  ('%liquid chlor%',            0.83),   -- Aquachem Liquid Chlorine, 15 L drum
  ('%sodium hypochlor%',        0.83),
  ('%calcium hypochlor%',       5.54),   -- PoolPlus 700, 10 kg
  ('%cal hypo%',                5.54),
  ('%pro cal%',                 5.54),   -- CONFIRM: priced as 70% cal hypo
  ('%triple%chlor%',           10.02),   -- Triple-Chlor 81% granular, 10 kg
  ('%granular chlorine%',      10.02),
  ('%chlorine tab%',            7.12),   -- stabilised tabs, 25 kg
  ('%hydrochloric%',            1.49),   -- Liquid Pool Acid, 15 L
  ('%pool acid%',               1.49),
  ('%dry acid%',                2.55),   -- pH Drop, 25 kg
  ('%bisulphate%',              2.55),
  ('%soda ash%',                2.64),   -- pH Lift, 25 kg
  ('%bicarb%',                  1.52),   -- Buffer Plus, 25 kg
  ('%calcium chloride%',        1.79),   -- Water Hardener, 25 kg
  ('%cyanuric%',                3.58),   -- Sunblock, 25 kg
  ('%stabiliser%',              3.58),
  ('%thiosulphate%',            6.48),   -- Chlorine Neutraliser, 25 kg
  ('%salt%',                    0.51),   -- Fine Grade Salt, 20 kg
  ('%algaecide%',               7.28),   -- Longlife, 10 L
  ('%clarifier%',              10.75),   -- Diamond Clear, 10 L
  ('%floc%',                    2.21),   -- Pool Floc, 25 kg
  ('%phosphate%',               9.97),   -- Phos Out Plus, 10 L
  ('%filter clean%',           10.98)    -- Filter Cleaner, 10 L
)
update chemicals c set unit_cost = p.cost
from price p where c.name ilike p.pattern;

-- No charge rates. Tony prices the invoice himself; this app's job is to say how much went in
-- at each site and what it cost us. Set unit_charge later only if that changes — the report
-- hides the charge and margin columns entirely until something has one.

notify pgrst, 'reload schema';

-- ── 3. check it. Anything reading "NO COST SET" needs doing by hand. ────────────────────────
select
  name,
  dose_unit as "per",
  coalesce(unit_cost::text, 'NO COST SET') as cost_per_unit
from chemicals
where is_active
order by unit_cost is not null, name;
