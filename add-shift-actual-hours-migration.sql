-- AquaPro — shifts: rostered end time is optional; techs log actual start / finish on site.
-- actual_start and actual_end already exist; hours = actual_end - actual_start.
alter table shifts alter column scheduled_end drop not null;
notify pgrst, 'reload schema';
