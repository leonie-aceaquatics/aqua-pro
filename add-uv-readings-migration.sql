-- AquaPro — UV system readings on a water test (Tony: record % output and run hours at UV sites)
alter table water_tests add column if not exists uv_output_pct numeric;
alter table water_tests add column if not exists uv_run_hours numeric;
notify pgrst, 'reload schema';
