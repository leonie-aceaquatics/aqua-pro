-- AquaPro — Tony (2026-09-20): record how long each backwash ran; strainers and injectors as explicit ticks.

-- 1. Backwash duration on the plant room log
alter table plant_logs add column if not exists backwash_minutes numeric;

-- 2. Standard task list (all sites) — reword three existing tasks rather than double up, add one
update site_tasks set label = 'Clean and check circulation pump strainer baskets'
where label = 'Empty pump strainer basket' and pool_id is null and is_active;

update site_tasks set label = 'Check dosing pumps and tubes for leaks or blockages'
where label = 'Check dosing pumps, tubes and injectors for leaks or blockages' and pool_id is null and is_active;

update site_tasks set label = 'Check filter pressure and backwash if needed — record how many minutes you backwashed in the Plant Room Log'
where label = 'Check filter pressure and backwash or clean filter if needed' and pool_id is null and is_active;

insert into site_tasks (label, category, sort_order)
select 'Injectors checked — clean, not blocked, no leaks', 'Equipment', 165
where not exists (select 1 from site_tasks where label like 'Injectors checked%' and pool_id is null and is_active);

notify pgrst, 'reload schema';

select sort_order, category, label from site_tasks where pool_id is null and pool_type is null and is_active order by sort_order;
