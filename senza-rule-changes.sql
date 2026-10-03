-- AquaPro — Senza close rules, per Ace's instruction (3 October 2026).
--
-- 1. Combined chlorine closes a bath ABOVE 1.0 mg/L and not below it. The ceiling was already
--    1.0, so nothing changes here; what changes is in lib/bath-status.ts, where "combined above
--    free" no longer closes a bath on its own at a site that states its own ceiling.
--
-- 2. High total alkalinity is not a problem at these baths. The upper band is removed, so
--    nothing flags an alkalinity over 200. The floor stays: below 80 still needs correcting and
--    below 60 still closes the bath.

update pool_water_targets t
set max_value = null
from pools p
where t.pool_id = p.id
  and p.site_code like 'SEN-BATH-%'
  and t.parameter = 'totalAlkalinity';

notify pgrst, 'reload schema';

select p.name, t.parameter, t.min_value, t.max_value, t.ideal_value, t.close_below, t.close_above
from pool_water_targets t join pools p on p.id = t.pool_id
where p.site_code like 'SEN-BATH-%'
order by p.name, t.parameter;
