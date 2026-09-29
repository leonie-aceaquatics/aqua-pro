-- AquaPro — Senza Health Club, Dromana: the three ice baths.
-- From the build spec (ACE-2026-SEN-TP-001 / LB-001). Tagged to the Senza organisation so their
-- logins see these and nothing else, and Ace sees them because Ace services Senza.
--
-- Run after add-organisations-migration.sql. Safe to re-run.
--
-- Chill Bunny cold plunge, 390 L each, three separate bodies of water tested and logged
-- separately. Manual dosing only — no controller, no automatic dosing, and ozone is never
-- recorded as a sanitiser.

insert into pools (
  org_id, site_code, name, address, suburb, state, postcode,
  pool_type, sanitiser_type, volume_litres, is_commercial, ph_correction_method, notes
)
select o.id, v.site_code, v.name, '60 Collins Road', 'Dromana', 'VIC', '3936',
       'leisure', 'chlorine', 390, true, 'acid', v.notes
from organisations o
cross join (values
  ('SEN-BATH-1', 'Senza Dromana – Bath 1', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.'),
  ('SEN-BATH-2', 'Senza Dromana – Bath 2', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.'),
  ('SEN-BATH-3', 'Senza Dromana – Bath 3', 'Chill Bunny cold plunge, 390 L. Manual dosing only, no controller. Drained, cleaned and refilled every night. Ozone unit in the chiller is NOT a disinfectant and must never be recorded as one.')
) as v(site_code, name, notes)
where o.slug = 'senza-health-club'
  and not exists (select 1 from pools p where p.site_code = v.site_code);

-- Their own task list — Senza's, not Ace's standard one.
insert into site_tasks (org_id, pool_id, label, category, sort_order, photos_required)
select o.id, p.id, v.label, v.category, v.ord, 0
from organisations o
join pools p on p.org_id = o.id and p.site_code like 'SEN-BATH-%'
cross join (values
  ('Check the circulation pump is running',                              'Arrival',         10),
  ('Run the calibration check disc and record the result',               'Arrival',         20),
  ('Take the sample at elbow depth, away from the return',               'Water quality',   30),
  ('Record free and combined chlorine, pH, temperature',                 'Water quality',   40),
  ('Record the bather count',                                            'Water quality',   50),
  ('Confirm the floor is visible (clarity)',                             'Water quality',   60),
  ('Dose if out of range, circulate 15 minutes, then retest and record', 'Chemical dosing', 70),
  ('Record the opening time and operator name',                          'Compliance',      80)
) as v(label, category, ord)
where o.slug = 'senza-health-club'
  and not exists (
    select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active
  );

notify pgrst, 'reload schema';

select p.site_code, p.name, p.volume_litres,
       (select count(*) from site_tasks t where t.pool_id = p.id and t.is_active) as tasks
from pools p join organisations o on o.id = p.org_id
where o.slug = 'senza-health-club' order by p.site_code;
