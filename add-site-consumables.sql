-- AquaPro — consumables that are used up AT a site but never dosed into the water.
--
-- A scum block or a spin disc costs money and gets consumed at one site, so it belongs in what
-- that site costs to service. They appear in the technician's "Chemicals Used" screen alongside
-- the chemicals, but `dosable = false` keeps them off the water test's dose suggestions —
-- nobody pours a disc into a pool.
--
-- unit_cost is left empty for the scum blocks because they are not on the Aquachem or LaMotte
-- lists I have. Put your supplier's price per block in under Depot Inventory and the per-site
-- cost picks it up from the next one used.

alter table chemicals add column if not exists dosable boolean not null default true;

insert into chemicals (org_id, name, type, unit, dose_unit, container_size,
                       current_stock, reorder_point, supplier, is_active, dosable)
select (select id from organisations where slug = 'ace-aquatics'),
       c.name, 'other', c.pack_unit, 'each', c.per_pack, 0, c.reorder, null, true, false
from (values
  ('Scum block',            'box', 12, 2),
  ('Scum sponge / sock',    'box', 12, 2)
) as c(name, pack_unit, per_pack, reorder)
where not exists (select 1 from chemicals x where x.name = c.name);

notify pgrst, 'reload schema';

-- Everything the techs can record against a site, and whether it is a dose or a consumable.
select name,
       case when dosable then 'dosed into the water' else 'consumable' end as kind,
       unit as counted_in, container_size as per_pack,
       coalesce(unit_cost::text, 'NO COST SET') as cost_each_or_per_unit
from chemicals where is_active
order by dosable desc, name;
