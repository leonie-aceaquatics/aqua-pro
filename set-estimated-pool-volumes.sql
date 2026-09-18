-- AquaPro — PLACEHOLDER pool volumes so the dose calculator works before Tony confirms the real figures.
-- Only fills in pools whose volume is still blank; anything already entered is left alone.
-- Each estimated pool gets "VOLUME ESTIMATED" added to its notes so it is obvious in Admin → Pools.
-- Doses worked out from these will be roughly right, not exact — re-test after dosing until real volumes are in.
--
-- Rules of thumb used (commercial bodies of water, Melbourne sites):
--   Hot spa (8–12 person commercial)              8,000 L
--   Cold plunge / cold pool / ice bath            4,000 L
--   River / current pool (recovery)              25,000 L
--   25 m indoor lap pool (4–6 lanes, ~1.2 m)    250,000 L
--   Apartment / residential-complex pool         80,000 L
--   Interactive water feature / splash pad       15,000 L  (balance tank)
--   Small courtyard water feature                10,000 L

update pools
set volume_litres = v.litres,
    notes = concat_ws(' · ', nullif(notes, ''), 'VOLUME ESTIMATED (' || v.litres || ' L placeholder) — confirm with Tony')
from (values
  ('AQ-002-A',   8000),  -- Embassy Apartments – Spa
  ('AQ-003-A',  80000),  -- Peppers (Lacrosse) – Pool
  ('AQ-004-A',  80000),  -- Flinders Wharf – Pool
  ('AQ-004-B',   8000),  -- Flinders Wharf – Spa
  ('AQ-005-A', 250000),  -- St Kevin's College – Pool
  ('AQ-007-A',   8000),  -- AAMI Park – Hot Spa
  ('AQ-007-B',   4000),  -- AAMI Park – Cold Plunge
  ('AQ-007-C', 250000),  -- AAMI Park – Lap Pool
  ('AQ-008-A',   8000),  -- Collingwood FC – Spa
  ('AQ-008-B',   4000),  -- Collingwood FC – Cold Pool
  ('AQ-008-C', 250000),  -- Collingwood FC – Lap Pool
  ('AQ-009-B',   8000),  -- Acacia Place Haven – Spa
  ('AQ-023-A',  10000),  -- Acacia Place – Water Feature
  ('AQ-010-A',   8000),  -- Acacia Place Eden – Spa
  ('AQ-011-A',   8000),  -- National Tennis Centre – Plant Room 1 Hot Spa
  ('AQ-011-B',   8000),  -- National Tennis Centre – Plant Room 2 Hot Spa
  ('AQ-012-A',  80000),  -- Moonee Ponds Trackside – Rooftop Pool
  ('AQ-013-A', 250000),  -- PACE 3058 – 25 m Indoor Lap Pool
  ('AQ-014-A',   8000),  -- Home of the Matildas – Spa
  ('AQ-014-B',   4000),  -- Home of the Matildas – Cold Pool
  ('AQ-014-C',  25000),  -- Home of the Matildas – River Pool
  ('AQ-016-A', 100000),  -- Westerfolds – Pool
  ('AQ-017-A',  15000),  -- Seville Water Play Park
  ('AQ-018-A',  15000),  -- Warburton Water World
  ('AQ-019-A',  15000),  -- Olinda Splash Pad
  ('AQ-020-A',  15000),  -- Lilydale Splash Pad
  ('AQ-021-A',   8000),  -- Wellness Elements – Hot Pool
  ('AQ-021-B',   4000)   -- Wellness Elements – Cold Pool
) as v(site_code, litres)
where pools.site_code = v.site_code
  and pools.volume_litres is null;

-- Known volumes left untouched: AUN Bathhouse (16,000 / 3,000), Better Health Network (130,000),
-- Acacia Place Haven 25 m pool (125,000), Eltham College (500,000), Meridian spa (2,800).

select site_code, name, volume_litres, notes from pools order by site_code;
