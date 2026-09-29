-- AquaPro — site access documents move to a PRIVATE bucket.
-- The existing 'attachments' bucket is public: any file in it is readable by anyone who has the
-- link, with no login. That is acceptable for job photos but not for the site access procedures,
-- which contain door and key safe codes. Those move to 'site-docs', which is private and served
-- through short-lived signed links generated only for a logged-in user.
--
-- Photos are NOT touched by this. They keep working exactly as they do now.

-- 1. The private bucket. (Or create it in Supabase → Storage → New bucket, name site-docs, Public OFF.)
insert into storage.buckets (id, name, public)
values ('site-docs', 'site-docs', false)
on conflict (id) do nothing;

-- 2. How to read a row:
--    storage_bucket null  → legacy: file_url is a public URL, use it as-is
--    storage_bucket set   → private: file_url holds the object path, must be signed before use
alter table attachments add column if not exists storage_bucket text;

notify pgrst, 'reload schema';

select id, name, public from storage.buckets order by name;
