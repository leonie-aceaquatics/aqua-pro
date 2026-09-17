-- AquaPro — Stock units vs dose units for chemicals
-- Stock is counted in containers (drum / bucket / bag / each) at stock take, but dosing is
-- logged in measurements (L / kg / g / mL / tablet). `unit` stays the STOCK unit.
-- `dose_unit` is what usage is logged in, and `container_size` is how many dose units one
-- stock unit holds (e.g. 15 L per drum). Usage logging converts: stock -= quantity / container_size.
-- container_size null or 0 means "dose unit == stock unit" (1:1), which is the pre-migration behaviour.

alter table chemicals add column if not exists dose_unit text not null default 'L';
alter table chemicals add column if not exists container_size numeric;

-- Existing rows: dose unit follows the stock unit where the stock unit is already a measurement.
update chemicals set dose_unit = unit where unit in ('L', 'kg', 'g', 'mL', 'tablet');

notify pgrst, 'reload schema';
