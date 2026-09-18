-- AquaPro — allow photos on plant room logs
-- attachments.entity_type is a check constraint, so a new entity type needs the constraint widened.

alter table attachments drop constraint if exists attachments_entity_type_check;
alter table attachments add constraint attachments_entity_type_check
  check (entity_type in ('incident', 'asset_service_log', 'water_test', 'microbiology_test', 'corrective_action', 'plant_log'));

notify pgrst, 'reload schema';
