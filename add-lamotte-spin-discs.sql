-- AquaPro — WaterLink Spin Touch discs as stock items, priced from LaMotte Pacific
-- (CP 1 Aug 2025, net ex GST). Discs run out and have to be reordered, so they belong on the
-- stock list and in the To Order queue alongside the chemicals.
--
-- Stock is counted in PACKS, usage in single DISCS, and unit_cost is per disc.
-- DELETE THE LINES FOR DISCS YOU DO NOT USE before running this — no point carrying stock
-- levels for a disc nobody puts in the machine.
--
-- unit_charge is left empty on purpose. A disc is a per-visit testing consumable, not a dose
-- into a pool, so it never reaches the monthly chemical invoice. Charging testing on would be
-- a separate per-visit line, or it stays inside the service fee.

insert into chemicals (org_id, name, type, unit, dose_unit, container_size,
                       current_stock, reorder_point, supplier, unit_cost, is_active)
select (select id from organisations where slug = 'ace-aquatics'),
       d.name, 'other', 'pack', 'each', d.per_pack, 0, 1, 'LaMotte Pacific', d.cost_per_disc, true
from (values
  -- code     name                                                              pack  $/disc
  ('4334-H', 'Spin disc 501 — Chlorine, 3 x 3 use (50 pack)',                     50,  5.18),
  ('4335-H', 'Spin disc 601 — Chlorine + Alkalinity, 3 x 3 use (50 pack)',        50,  5.18),
  ('4348-J', 'Spin disc 104 — Chlorine (100 pack)',                              100,  4.50),
  ('4349-J', 'Spin disc 204 — Chlorine + Phosphate (100 pack)',                  100,  4.20),
  ('4350-J', 'Spin disc 304 — Chlorine + Borate (100 pack)',                     100,  4.60),
  ('4355-J', 'Spin disc 801 — Magnesium (100 pack)',                             100,  4.50)
) as d(code, name, per_pack, cost_per_disc)
where not exists (select 1 from chemicals c where c.name = d.name);

notify pgrst, 'reload schema';

select name, unit as counted_in, dose_unit as used_in, container_size as per_pack,
       unit_cost as cost_per_disc, current_stock, reorder_point, supplier
from chemicals where supplier = 'LaMotte Pacific' order by name;
