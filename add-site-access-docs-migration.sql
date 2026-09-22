-- AquaPro — site access documents (PDF procedures, walkthrough videos) attached to a site,
-- plus Meridian's access notes from ACE-SOP-MER-001 v1.1 (22 Sep 2026).

alter table attachments drop constraint if exists attachments_entity_type_check;
alter table attachments add constraint attachments_entity_type_check
  check (entity_type in ('incident', 'asset_service_log', 'water_test', 'microbiology_test', 'corrective_action', 'plant_log', 'site_task_completion', 'pool_access'));

update pools set access_notes =
'FRONT DOOR: ICOM keypad — press BELL, enter 2795, press BELL again.
KEY SAFE: through the lobby, around the corner — black Kidde safe on the fire panel door. Code 2975 (push-button, nothing to scramble). SIGN IN on the QR form beside it BEFORE taking a key — the OC can withdraw our access if we don''t.
LIFT: scan fob, press 7 (rooftop). Turn left out of the lift, fob the reader left of the glass door.
ROOFTOP: hours 7 am–10 pm, CCTV, no glass past the entry. Check the area is clear of residents first.
PLANT ROOM: behind the slatted gate signed PLANT ROOM. Key stamped ROMA — turn it, reach through and release the latch. Close the gate behind you.
CHEMICAL CAGE: ABUS padlock — key stamped WHITCO. Keep it locked when unattended.
BEFORE LEAVING: re-lock the cage · latch the gate · both keys back in the key safe and close it · record the visit in the site logbook and AquaPro.
SITE CONTACT: Brent, Building Manager (BCCS) 0499 223 008.
SCOPE: equipment service and maintenance only — monitoring, balancing, records and micro sampling are BCCS''s.'
where name ilike '%Meridian%';

notify pgrst, 'reload schema';
select name, access_notes from pools where name ilike '%Meridian%';
