-- AquaPro — National Tennis Centre has a hot spa AND a cold plunge pool, not two hot spas.
-- Confirmed by Tahi on site, 12 October 2026. This closes the "CONFIRM: ice baths being
-- converted to hot spas" note that has been sitting on both records since the site was set up.
--
--   Plant Room 1 — hot spa        (unchanged)
--   Plant Room 2 — cold plunge    (was recorded as a second hot spa)
--
-- Why this matters beyond the name: a hot spa runs free chlorine at 3.0 to 5.0 because heat
-- burns a residual off fast. A cold plunge holds chlorine far better and runs 2.0 to 5.0. Left
-- as a spa, Plant Room 2 would have been flagged out of range, and the dose calculator would
-- have told the technician to add chlorine it did not need.

-- 1. Allow the new type.
alter table pools drop constraint if exists pools_pool_type_check;
alter table pools add constraint pools_pool_type_check
  check (pool_type in ('indoor', 'outdoor', 'spa', 'plunge', 'wading', 'hydrotherapy',
                       'leisure', 'splash_pad', 'facility'));

-- 2. Plant Room 2 is the plunge pool.
update pools set
  name = 'National Tennis Centre – Plant Room 2 Plunge Pool',
  pool_type = 'plunge',
  notes = 'Cold plunge pool. Confirmed on site by Tahi 12 Oct 2026. VOLUME IS AN 8,000 L ESTIMATE — needs measuring.'
where site_code = 'AQ-011-B';

-- 3. Plant Room 1 is the hot spa. Same name, but the CONFIRM note is answered now.
update pools set
  name = 'National Tennis Centre – Plant Room 1 Hot Spa',
  pool_type = 'spa',
  notes = 'Hot spa. Confirmed on site by Tahi 12 Oct 2026. VOLUME IS AN 8,000 L ESTIMATE — needs measuring.'
where site_code = 'AQ-011-A';

notify pgrst, 'reload schema';

select site_code, name, pool_type, volume_litres, notes
from pools where site_code like 'AQ-011-%' order by site_code;
