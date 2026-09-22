-- AquaPro — add ProCal granular chlorine (calcium hypochlorite) to the chemical list.
-- Stock is counted in tubs; dosing is logged in kg. Set the tub size below to what your
-- supplier's tub actually holds (10 kg is a common size) — the app converts kg used → tubs.
insert into chemicals (name, type, unit, dose_unit, container_size, current_stock, reorder_point, is_active)
select 'ProCal Granular Chlorine (calcium hypochlorite)', 'sanitiser', 'tub', 'kg', 10, 0, 2, true
where not exists (select 1 from chemicals where name ilike '%ProCal%');

select name, type, unit as stock_unit, dose_unit, container_size, current_stock, reorder_point from chemicals order by name;
