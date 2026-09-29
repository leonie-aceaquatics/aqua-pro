-- AquaPro — allow the client roles on staff.
-- staff.role is a check constraint, so the two new roles have to be added to it as well as to
-- the app. 'pool_manager' is in the app's list too and was never added to the database either.
--
--   client_admin    a client's owner or manager: their own sites, records and staff
--   client_operator a client's staff: record readings, checklist, calculator

alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role in ('admin', 'manager', 'technician', 'contractor', 'pool_manager', 'client_admin', 'client_operator'));

notify pgrst, 'reload schema';

select role, count(*) from staff group by role order by role;
