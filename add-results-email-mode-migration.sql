-- AquaPro — how much test email each organisation wants.
--
--   all        every test, as it is logged. Right for Ace: ~39 sites tested weekly.
--   exceptions only when something is out of range or a body of water needs closing,
--              plus one summary of the day at close of business.
--   none       no test email at all.
--
-- Senza is 3 baths x 4 rounds = 12 readings a day before retests. "all" would be ~85 emails a
-- week to the owner, which nobody reads. They get exceptions plus the daily summary.

alter table organisations add column if not exists results_email_mode text not null default 'all';
alter table organisations drop constraint if exists organisations_results_email_mode_check;
alter table organisations add constraint organisations_results_email_mode_check
  check (results_email_mode in ('all', 'exceptions', 'none'));

update organisations set results_email_mode = 'exceptions' where slug = 'senza-health-club';

notify pgrst, 'reload schema';

select name, results_email, results_email_mode from organisations order by is_service_provider desc, name;
