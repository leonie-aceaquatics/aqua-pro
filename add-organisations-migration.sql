-- AquaPro — organisations: the fence that lets a client log in and see only their own records.
--
-- Everything that exists today belongs to Ace Aquatics, which is flagged as the service provider.
-- A provider sees its own org plus the orgs it services. A client sees only itself.
--
-- Only six tables carry an org_id. Everything else in the database hangs off a pool or a staff
-- member and inherits the boundary from them. The three that matter most are the ones with a
-- nullable pool_id meaning "applies to every site" — without an org_id those rows would cross
-- between companies.
--
-- Safe to re-run.

-- ── 1. The tables ────────────────────────────────────────────────────────────
create table if not exists organisations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  is_service_provider boolean not null default false,   -- Ace: true. Clients: false.
  logo_url            text,                             -- shown on that org's portal
  results_email       text,                             -- water test results also go here
  is_active           boolean not null default true,
  created_at          timestamptz default now()
);

-- Which client orgs a provider can see. No row = no access.
create table if not exists provider_clients (
  provider_org_id uuid not null references organisations(id) on delete cascade,
  client_org_id   uuid not null references organisations(id) on delete cascade,
  created_at      timestamptz default now(),
  primary key (provider_org_id, client_org_id),
  check (provider_org_id <> client_org_id)
);

-- ── 2. Ace, and everything that exists now belongs to it ─────────────────────
insert into organisations (name, slug, is_service_provider, results_email)
select 'Ace Aquatics', 'ace-aquatics', true, 'info@aceaquatics.com.au'
where not exists (select 1 from organisations where slug = 'ace-aquatics');

alter table pools                   add column if not exists org_id uuid references organisations(id);
alter table staff                   add column if not exists org_id uuid references organisations(id);
alter table chemicals               add column if not exists org_id uuid references organisations(id);
alter table service_routes          add column if not exists org_id uuid references organisations(id);
alter table staff_feedback          add column if not exists org_id uuid references organisations(id);
-- These two have a nullable pool_id meaning "applies to every site", so they need their own org.
alter table site_tasks              add column if not exists org_id uuid references organisations(id);
alter table compliance_requirements add column if not exists org_id uuid references organisations(id);

update pools                   set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update staff                   set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update chemicals               set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update service_routes          set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update staff_feedback          set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update site_tasks              set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;
update compliance_requirements set org_id = (select id from organisations where slug = 'ace-aquatics') where org_id is null;

-- ── 3. Required from here on, so a new row can never be left unowned ─────────
alter table pools                   alter column org_id set not null;
alter table staff                   alter column org_id set not null;
alter table chemicals               alter column org_id set not null;
alter table service_routes          alter column org_id set not null;
alter table site_tasks              alter column org_id set not null;
alter table compliance_requirements alter column org_id set not null;
-- staff_feedback stays nullable: bug reports about the app itself are not owned by a client.

create index if not exists idx_pools_org                   on pools(org_id);
create index if not exists idx_staff_org                   on staff(org_id);
create index if not exists idx_chemicals_org               on chemicals(org_id);
create index if not exists idx_service_routes_org          on service_routes(org_id);
create index if not exists idx_site_tasks_org              on site_tasks(org_id);
create index if not exists idx_compliance_requirements_org on compliance_requirements(org_id);

-- ── 4. Senza, and Ace's access to them ───────────────────────────────────────
insert into organisations (name, slug, is_service_provider, results_email)
select 'Senza Health Club', 'senza-health-club', false, 'Catherine@ozzfit.com.au'
where not exists (select 1 from organisations where slug = 'senza-health-club');

insert into provider_clients (provider_org_id, client_org_id)
select p.id, c.id from organisations p, organisations c
where p.slug = 'ace-aquatics' and c.slug = 'senza-health-club'
on conflict do nothing;

notify pgrst, 'reload schema';

-- Everything should say Ace Aquatics, and Senza should have nothing yet.
select o.name, o.is_service_provider,
       (select count(*) from pools    where org_id = o.id) as pools,
       (select count(*) from staff    where org_id = o.id) as staff,
       (select count(*) from chemicals where org_id = o.id) as chemicals
from organisations o order by o.is_service_provider desc, o.name;
