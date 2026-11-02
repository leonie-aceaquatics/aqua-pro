-- AquaPro — Before & After cleaning jobs.
--
-- A technician picks a job (pool floor, scum line, plant room tidy-up, pool deck, or something
-- else), photographs it BEFORE, does the work, then photographs it AFTER. The pair goes in the
-- site visit email so the office can forward it to the client as proof the work was done.
--
-- Photos attach with entity_type = 'cleaning_before' / 'cleaning_after', entity_id = the job.
-- Up to 3 of each per job (checked in the app).
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists cleaning_jobs (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  org_id uuid references organisations(id),
  shift_id uuid references shifts(id) on delete set null,
  job_type text not null
    check (job_type in ('pool_floor', 'scum_line', 'plant_room', 'pool_deck', 'other')),
  job_label text,                       -- what "other" was, typed by the technician
  status text not null default 'in_progress'
    check (status in ('in_progress', 'done')),
  started_by uuid references staff(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_cleaning_jobs_pool_day on cleaning_jobs(pool_id, started_at);

alter table cleaning_jobs enable row level security;

-- attachments.entity_type is a check constraint, so new photo types need it widened.
-- 'recommendation' is included too: Report a Problem → Recommendation photos use it, and the
-- last constraint written (add-site-access-docs-migration.sql) did not list it.
alter table attachments drop constraint if exists attachments_entity_type_check;
alter table attachments add constraint attachments_entity_type_check
  check (entity_type in ('incident', 'asset_service_log', 'water_test', 'microbiology_test', 'corrective_action',
                         'plant_log', 'site_task_completion', 'pool_access', 'recommendation',
                         'cleaning_before', 'cleaning_after'));

notify pgrst, 'reload schema';

select 'cleaning_jobs ready' as result;
