-- AquaPro — Per-site chemical stock
-- Stock is held at each site, so track quantity per pool per chemical. Technicians count it
-- on each visit ("Count Stock" in the tech app); admin sees every site in Chemicals → Site Stock.
-- chemicals.current_stock stays as the depot / central stock. A dose logged against a pool
-- comes off that site's stock when the site holds the chemical, otherwise off the depot.
-- Run after add-site-tasks-migration.sql and add-site-tasks-seed.sql.

create table site_chemical_stock (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references pools(id) on delete cascade,
  chemical_id      uuid not null references chemicals(id) on delete cascade,
  quantity         numeric not null default 0,      -- in the chemical's stock unit (drum / bag / each)
  last_counted_at  timestamptz,
  last_counted_by  uuid references staff(id),
  updated_at       timestamptz default now(),
  unique (pool_id, chemical_id)
);
create index idx_site_chemical_stock_pool on site_chemical_stock(pool_id);
create index idx_site_chemical_stock_chemical on site_chemical_stock(chemical_id);

-- To Order entries can now say which site is low (null = depot)
alter table chemical_orders add column if not exists pool_id uuid references pools(id) on delete set null;

-- Make the count part of the standard visit (column add is a no-op if the seed already ran)
alter table site_tasks add column if not exists category text;
insert into site_tasks (label, category, sort_order)
select 'Count chemical stock on site and record it in AquaPro', 'Compliance', 345
where not exists (select 1 from site_tasks where label = 'Count chemical stock on site and record it in AquaPro' and is_active);

notify pgrst, 'reload schema';
