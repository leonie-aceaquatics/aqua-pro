-- AquaPro — bug-report screenshots move to a private bucket.
-- 'feedback-screenshots' was public: any screenshot was readable by anyone with the link, no
-- login. A screenshot of the app can show test results, a staff list or a site's readings.
--
-- Screenshots already uploaded keep working: the app takes the path out of the old public URL
-- and signs that, so flipping the bucket does not break the ones in the Error Log.

update storage.buckets set public = false where id = 'feedback-screenshots';

select id, name, public from storage.buckets order by name;
