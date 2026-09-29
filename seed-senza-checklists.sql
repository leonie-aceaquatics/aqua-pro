-- AquaPro — Senza Dromana: the real checklists from ACE-2026-SEN-LB-001.
-- Replaces the placeholder list seeded earlier with forms F1 (pre-open), F2 (close of business)
-- and F11 (weekly plant check), worded as the log book has them.
-- Run after seed-senza-dromana-site.sql. Safe to re-run.

-- Retire the placeholder list
update site_tasks set is_active = false
where pool_id in (select id from pools where site_code like 'SEN-BATH-%')
  and label in (
    'Check the circulation pump is running',
    'Run the calibration check disc and record the result',
    'Take the sample at elbow depth, away from the return',
    'Record free and combined chlorine, pH, temperature',
    'Record the bather count',
    'Confirm the floor is visible (clarity)',
    'Dose if out of range, circulate 15 minutes, then retest and record',
    'Record the opening time and operator name'
  );

insert into site_tasks (org_id, pool_id, label, category, sort_order, photos_required)
select o.id, p.id, v.label, v.category, v.ord, 0
from organisations o
join pools p on p.org_id = o.id and p.site_code like 'SEN-BATH-%'
cross join (values
  -- ── Pre-open (F1) ──────────────────────────────────────────────────────────
  ('Circulation pump running — if it is off, this bath cannot open',            'Pre-open',  10),
  ('Calibration check disc run and recorded — a fail means the baths do not open', 'Pre-open', 20),
  ('Sample taken at elbow depth, away from the return',                          'Pre-open',  30),
  ('Full panel recorded for this bath',                                          'Pre-open',  40),
  ('Dosed if out of target, circulated 15 minutes, retested and recorded',       'Pre-open',  50),
  ('Floor of the bath clearly visible',                                          'Pre-open',  60),
  ('Opening time and operator name recorded',                                    'Pre-open',  70),

  -- ── Close of business, every trading day (F2) ─────────────────────────────
  ('Bath closed to bathers, signage placed',                                     'Close',    110),
  ('Final readings and bather count recorded before draining',                   'Close',    120),
  ('Bath drained completely',                                                    'Close',    130),
  ('Cartridge filter removed, cleaned, refitted',                                'Close',    140),
  ('All wetted surfaces and the waterline scrubbed — non-abrasive pad only',     'Close',    150),
  ('Rinsed thoroughly with mains water',                                         'Close',    160),
  ('Surround, steps and handrails wiped down',                                   'Close',    170),
  ('Refilled to operating level',                                                'Close',    180),
  ('Sodium bicarbonate added — 39 g',                                            'Close',    190),
  ('Circulated 15 minutes',                                                      'Close',    200),
  ('Sodium hypochlorite 12.5% added — 9.4 mL',                                   'Close',    210),
  ('Circulated 15 minutes, full panel tested',                                   'Close',    220),
  ('pH adjusted to 7.3 to 7.6 with dry acid, grams recorded',                    'Close',    230),
  ('Circulation pump left running overnight',                                    'Close',    240),
  ('Weekly deep clean — 1:10 chlorine, 10 minute soak, rinsed (once a week)',    'Close',    250),

  -- ── Weekly plant, equipment and facility check (F11) ──────────────────────
  ('Circulation pump running continuously',                                      'Weekly',   310),
  ('Cartridge filter clean and correctly fitted',                                'Weekly',   320),
  ('No leaks from the bath, hoses or fittings',                                  'Weekly',   330),
  ('Chiller operating and holding setpoint',                                     'Weekly',   340),
  ('Stainless surfaces free of pitting, staining or damage',                     'Weekly',   350),
  ('Waterline and surfaces free of film or biofilm',                             'Weekly',   360),
  ('Drain and refill hoses in good condition, stored clean',                     'Weekly',   370),
  ('Floor surround clean and non-slip',                                          'Weekly',   380),
  ('Steps and handrails secure',                                                 'Weekly',   390),
  ('Signage in place and legible',                                               'Weekly',   400),
  ('Bath closure signs available at the station',                                'Weekly',   410),
  ('Testing station tidy, meter and discs stored dry and within date',           'Weekly',   420),
  ('Measuring cylinders labelled, clean and not interchanged',                   'Weekly',   430),
  ('Room ventilation operating, no excessive condensation',                      'Weekly',   440),
  ('Chemical store locked and inaccessible to members',                          'Weekly',   450),
  ('PPE present and serviceable — goggles, gloves, apron, face shield',          'Weekly',   460),
  ('Acids and chlorine bunded separately, dry acid stored with the acids',       'Weekly',   470)
) as v(label, category, ord)
where o.slug = 'senza-health-club'
  and not exists (select 1 from site_tasks t where t.label = v.label and t.pool_id = p.id and t.is_active);

notify pgrst, 'reload schema';

select t.category, count(*) as tasks
from site_tasks t join pools p on p.id = t.pool_id
where p.site_code = 'SEN-BATH-1' and t.is_active
group by t.category order by min(t.sort_order);
