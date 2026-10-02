-- AquaPro — why a photo might not upload.
-- A bucket can carry a file size limit and a list of allowed types. A phone photo is 4-12 MB,
-- so a low limit rejects it. The app now shrinks photos to about 1600px before uploading, which
-- usually brings them under 1 MB, but it is worth seeing what the limits actually are.

select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;

-- How many photos have actually landed, by type, over the last fortnight
select entity_type, count(*) as photos, max(created_at) as most_recent
from attachments where created_at > now() - interval '14 days'
group by entity_type order by photos desc;
