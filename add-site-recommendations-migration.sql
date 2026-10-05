-- AquaPro — recommendations raised by a technician on site.
--
-- A recommendation is not a fault. "The pump is dead" is an incident and goes in the incident
-- log; "that grate is lifting and will be a trip hazard by summer" is work worth quoting for,
-- and until now there was nowhere to put it, so it stayed in someone's head or a text message.
--
-- Photos attach with entity_type = 'recommendation', the same as any other attachment.

create table if not exists site_recommendations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  org_id uuid references organisations(id),
  raised_by uuid references staff(id),
  raised_at timestamptz not null default now(),
  title text not null,
  detail text,
  urgency text not null default 'when_convenient'
    check (urgency in ('urgent', 'soon', 'when_convenient')),
  status text not null default 'open'
    check (status in ('open', 'quoted', 'approved', 'done', 'declined')),
  office_notes text
);

create index if not exists idx_site_recommendations_pool on site_recommendations(pool_id);
create index if not exists idx_site_recommendations_status on site_recommendations(status);

update site_recommendations r
set org_id = (select p.org_id from pools p where p.id = r.pool_id)
where org_id is null;

notify pgrst, 'reload schema';

select 'site_recommendations ready' as result;
