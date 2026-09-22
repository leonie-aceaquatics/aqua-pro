-- AquaPro — site access: keys, gate/door codes, parking, where the plant room is.
-- Free text per site, visible to logged-in staff only. Edit in Admin → Pools.
alter table pools add column if not exists access_notes text;
notify pgrst, 'reload schema';
