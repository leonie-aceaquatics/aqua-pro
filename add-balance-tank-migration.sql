-- AquaPro — splash park balance tanks: record how full the tank is (%) with each water test
alter table water_tests add column if not exists balance_tank_pct numeric;

-- Real tank volumes (replace the placeholder estimates) — Tony, 22 Sep 2026
update pools set volume_litres = 100000,
  notes = regexp_replace(coalesce(notes, ''), ' · VOLUME ESTIMATED[^·]*', '')
where name ilike '%Warburton%';
update pools set volume_litres = 50000,
  notes = regexp_replace(coalesce(notes, ''), ' · VOLUME ESTIMATED[^·]*', '')
where name ilike '%Seville%';

-- The splash-pad task now says where to record it
update site_tasks set label = 'Check balance tank level and record % full in the water test'
where label = 'Check water tank level' and pool_type = 'splash_pad' and is_active;

notify pgrst, 'reload schema';

select name, volume_litres, notes from pools where name ilike '%Warburton%' or name ilike '%Seville%';
