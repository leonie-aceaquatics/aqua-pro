-- Ace Aquatics serviced sites — pool register load (2026-09-17)
-- One row per body of water. Site code = AQ-<site>-<body letter>.
-- Safe to re-run: rows whose site_code already exists are skipped.
-- pool_type / sanitiser_type are best guesses where the source said TBC — edit in Admin → Pools.
--   pool_type   : indoor | outdoor | spa | wading | hydrotherapy | leisure   (leisure = cold plunge / ice bath / river pool)
--   sanitiser   : chlorine | bromine | saltwater | uv_chlorine | ozone_chlorine | baquacil

-- Remove rows from the earlier draft that turned out not to exist (no-op if never loaded)
delete from pools where site_code in ('AQ-003-B', 'AQ-005-B', 'AQ-010-B');

insert into pools (site_code, name, address, suburb, state, postcode, pool_type, sanitiser_type, volume_litres, is_commercial, notes) values

-- 1. AUN Bathhouse
('AQ-001-A', 'AUN Bathhouse – Hot Spa',           '155 Abbotsford Street', 'North Melbourne', 'VIC', '3051', 'spa',     'saltwater', 16000, true, 'Halo Chlor salt cells; liquid chlorine top-up pump on spa'),
('AQ-001-B', 'AUN Bathhouse – Cold Ice Bath',     '155 Abbotsford Street', 'North Melbourne', 'VIC', '3051', 'leisure', 'saltwater', 3000,  true, 'Halo Chlor salt cells'),

-- 2. Embassy Apartments
('AQ-002-A', 'Embassy Apartments – Spa',          'TBC', 'Richmond', 'VIC', '3121', 'spa',     'chlorine', null, true, 'CONFIRM: street address, volume, sanitiser'),

-- 3. Peppers Apartments (Lacrosse)
('AQ-003-A', 'Peppers Apartments (Lacrosse) – Pool', '673 La Trobe Street', 'Docklands', 'VIC', '3008', 'indoor', 'chlorine', null, true, 'ProMinent dosing (confirm sanitiser). Volume TBC'),

-- 4. Flinders Wharf
('AQ-004-A', 'Flinders Wharf – Pool',             '60 Siddeley Street', 'Docklands', 'VIC', '3008', 'indoor', 'chlorine', null, true, 'Chemtrol automated dosing (confirm sanitiser). Volume TBC'),
('AQ-004-B', 'Flinders Wharf – Spa',              '60 Siddeley Street', 'Docklands', 'VIC', '3008', 'spa',    'chlorine', null, true, 'Chemtrol automated dosing (confirm sanitiser). Volume TBC'),

-- 5. St Kevin's College
('AQ-005-A', 'St Kevin''s College – Pool',        'TBC', null, 'VIC', null, 'indoor', 'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),

-- 6. Better Health Network, Bentleigh East
('AQ-006-A', 'Better Health Network – Hydrotherapy Pool', '2A Gardeners Road', 'Bentleigh East', 'VIC', '3165', 'hydrotherapy', 'chlorine', 130000, true, '13 m x 8 m, 1.0–1.5 m deep. Liquid chlorine (sodium hypochlorite); CO2 for pH'),

-- 7. AAMI Park
('AQ-007-A', 'AAMI Park – Hot Spa',               'Olympic Boulevard', 'Melbourne', 'VIC', '3000', 'spa',     'chlorine', null, true, 'Liquid chlorine (sodium hypochlorite). Volume TBC'),
('AQ-007-B', 'AAMI Park – Cold Plunge',           'Olympic Boulevard', 'Melbourne', 'VIC', '3000', 'leisure', 'chlorine', null, true, 'Liquid chlorine (sodium hypochlorite). Volume TBC'),
('AQ-007-C', 'AAMI Park – Lap Pool',              'Olympic Boulevard', 'Melbourne', 'VIC', '3000', 'indoor',  'chlorine', null, true, 'Liquid chlorine (sodium hypochlorite). Volume TBC'),

-- 8. Collingwood FC (AIA Centre)
('AQ-008-A', 'Collingwood FC – Spa',              'Olympic Boulevard', 'Melbourne', 'VIC', '3004', 'spa',     'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),
('AQ-008-B', 'Collingwood FC – Cold Pool',        'Olympic Boulevard', 'Melbourne', 'VIC', '3004', 'leisure', 'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),
('AQ-008-C', 'Collingwood FC – Lap Pool',         'Olympic Boulevard', 'Melbourne', 'VIC', '3004', 'indoor',  'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),

-- 9. Acacia Place Haven
('AQ-009-A', 'Acacia Place Haven – 25 m Outdoor Pool', '6 Acacia Place', 'Abbotsford', 'VIC', '3067', 'outdoor', 'chlorine', 125000, true, 'BECSys5 controller. Sanitiser TBC'),
('AQ-009-B', 'Acacia Place Haven – Spa',          '6 Acacia Place', 'Abbotsford', 'VIC', '3067', 'spa',     'chlorine', null,   true, 'BECSys5 controller. Sanitiser and volume TBC'),
('AQ-023-A', 'Acacia Place – Water Feature',      'Acacia Place (between Haven and Eden)', 'Abbotsford', 'VIC', '3067', 'wading',  'chlorine', null,   true, 'Standalone water feature between the Haven and Eden buildings. Volume and sanitiser TBC'),

-- 10. Acacia Place Eden
('AQ-010-A', 'Acacia Place Eden – Spa',           '1 Acacia Place', 'Abbotsford', 'VIC', '3067', 'spa',     'saltwater', null, true, 'Envirogen 75 g/h salt chlorinator with liquid chlorine backup; UV and ozone installed. Volume TBC'),

-- 11. National Tennis Centre (Rod Laver Arena)
('AQ-011-A', 'National Tennis Centre – Plant Room 1 Hot Spa', 'Olympic Boulevard', 'Melbourne', 'VIC', '3001', 'spa', 'chlorine', null, true, 'CONFIRM: ice baths being converted to hot spas across two plant rooms — confirm count, address, volume, sanitiser'),
('AQ-011-B', 'National Tennis Centre – Plant Room 2 Hot Spa', 'Olympic Boulevard', 'Melbourne', 'VIC', '3001', 'spa', 'chlorine', null, true, 'CONFIRM: ice baths being converted to hot spas across two plant rooms — confirm count, address, volume, sanitiser'),

-- 12. Moonee Ponds Trackside
('AQ-012-A', 'Moonee Ponds Trackside – Rooftop Pool', '33 Thomas Street', 'Moonee Ponds', 'VIC', '3039', 'outdoor', 'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),

-- 13. PACE 3058
('AQ-013-A', 'PACE 3058 – 25 m Indoor Lap Pool', '9S Wardens Walk', 'Coburg', 'VIC', '3058', 'indoor', 'chlorine', null, true, 'CONFIRM: address, volume, sanitiser'),

-- 14. Home of the Matildas
('AQ-014-A', 'Home of the Matildas – Spa',        '3 Sports Drive', 'Bundoora', 'VIC', '3083', 'spa',     'chlorine', null, true, 'Volume and sanitiser TBC'),
('AQ-014-B', 'Home of the Matildas – Cold Pool',  '3 Sports Drive', 'Bundoora', 'VIC', '3083', 'leisure', 'chlorine', null, true, 'Volume and sanitiser TBC'),
('AQ-014-C', 'Home of the Matildas – River Pool', '3 Sports Drive', 'Bundoora', 'VIC', '3083', 'leisure', 'chlorine', null, true, 'Volume and sanitiser TBC'),

-- 15. Eltham College
('AQ-015-A', 'Eltham College – 25 m Indoor Pool', '1660 Main Road', 'Research', 'VIC', '3095', 'indoor', 'chlorine', 500000, true, 'Volume as advised by the College. Chlorine dosing pumps; sodium bisulphate for pH. Confirm address'),

-- 16. Westerfolds
('AQ-016-A', 'Westerfolds – Pool',                'TBC', null, 'VIC', null, 'outdoor', 'chlorine', null, true, 'Chlorine tank on site; sodium bisulphate for pH. CONFIRM: address, indoor/outdoor, volume'),

-- 17–20. Interactive water features
('AQ-017-A', 'Seville Water Play Park – Water Feature',   '20-28 Monbulk-Seville Road', 'Seville',   'VIC', '3139', 'wading', 'chlorine', null, true, 'Interactive water feature. Volume and sanitiser TBC'),
('AQ-018-A', 'Warburton Water World – Water Feature',     '20 Woods Point Road',        'Warburton', 'VIC', '3799', 'wading', 'chlorine', null, true, 'Interactive water feature. Volume and sanitiser TBC'),
('AQ-019-A', 'Olinda Splash Pad – Water Feature',         'TBC',                        'Olinda',    'VIC', '3788', 'wading', 'chlorine', null, true, 'Interactive water feature. CONFIRM: street address, volume, sanitiser'),
('AQ-020-A', 'Lilydale Splash Pad – Water Feature',       'Lillydale Lake, Swansea Road', 'Lilydale', 'VIC', '3140', 'wading', 'chlorine', null, true, 'Interactive water feature. CONFIRM: address, volume, sanitiser'),

-- 21. Wellness Elements
('AQ-021-A', 'Wellness Elements – Hot Pool',      'TBC', null, 'VIC', null, 'spa',     'chlorine', null, true, 'CONFIRM: address, number of hot/cold pools, volume, sanitiser'),
('AQ-021-B', 'Wellness Elements – Cold Pool',     'TBC', null, 'VIC', null, 'leisure', 'chlorine', null, true, 'CONFIRM: address, number of hot/cold pools, volume, sanitiser'),

-- 22. Meridian Apartments
('AQ-022-A', 'Meridian Apartments – Rooftop Spa', '25-29 Alma Road', 'St Kilda', 'VIC', '3182', 'spa', 'chlorine', 2800, true, '2.0 m x 2.0 m x 0.7 m. Chemtrol controller. Sanitiser TBC')

on conflict (site_code) do nothing;

-- Bentleigh East doses CO2 for pH-down (every other site defaults to acid)
update pools set ph_correction_method = 'co2' where site_code = 'AQ-006-A';

select site_code, name, pool_type, sanitiser_type, volume_litres, notes from pools order by site_code;
