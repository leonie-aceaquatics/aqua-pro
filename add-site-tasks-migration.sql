-- AquaPro — Site Tasks Migration
-- A simple per-site "what to do on each visit" tick list, separate from the detailed
-- lifeguard Shift Checklist. Admin defines the tasks (for all sites, or one pool);
-- technicians tick them off per site per day.
-- Run after supabase-schema.sql, then: NOTIFY pgrst, 'reload schema';

create table site_tasks (
  id          uuid primary key default gen_random_uuid(),
  pool_id     uuid references pools(id) on delete cascade,   -- null = applies to every site
  label       text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references staff(id),
  created_at  timestamptz default now()
);

create table site_task_completions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references site_tasks(id) on delete cascade,
  pool_id      uuid not null references pools(id) on delete cascade,
  task_date    date not null default current_date,
  completed_by uuid references staff(id),
  completed_at timestamptz default now(),
  unique (task_id, pool_id, task_date)
);

create index idx_site_tasks_pool on site_tasks(pool_id);
create index idx_site_task_completions_pool_date on site_task_completions(pool_id, task_date desc);
