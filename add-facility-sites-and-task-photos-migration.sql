-- AquaPro — non-water "facility" sites (e.g. a gym) + photos on site tasks
-- Run BEFORE add-aami-park-site-tasks.sql.

-- 1. A site that has no water: no water tests, plant log, dosing or stock — just its own task list.
alter table pools drop constraint if exists pools_pool_type_check;
alter table pools add constraint pools_pool_type_check
  check (pool_type in ('indoor', 'outdoor', 'spa', 'wading', 'hydrotherapy', 'leisure', 'splash_pad', 'facility'));

-- 2. A task can require photos; the technician attaches them to that day's tick.
alter table site_tasks add column if not exists photos_required int not null default 0;

alter table attachments drop constraint if exists attachments_entity_type_check;
alter table attachments add constraint attachments_entity_type_check
  check (entity_type in ('incident', 'asset_service_log', 'water_test', 'microbiology_test', 'corrective_action', 'plant_log', 'site_task_completion'));

notify pgrst, 'reload schema';
