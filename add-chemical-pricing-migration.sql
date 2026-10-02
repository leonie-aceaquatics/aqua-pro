-- AquaPro — chemical pricing, so site usage can be invoiced.
--
-- Two rates per chemical, both per DOSE unit (the litre or kilogram a dose is measured in,
-- not the drum it is stored in):
--   unit_cost    what Ace pays
--   unit_charge  what the client is billed — the marked up price
--
-- Both nullable: a chemical with no charge rate shows on the usage report as unpriced rather
-- than silently billing at zero.

alter table chemicals add column if not exists unit_cost numeric;
alter table chemicals add column if not exists unit_charge numeric;

notify pgrst, 'reload schema';

select name, dose_unit, unit_cost, unit_charge from chemicals where is_active order by name;
