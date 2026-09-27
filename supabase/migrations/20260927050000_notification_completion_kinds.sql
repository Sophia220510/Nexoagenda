begin;

alter table public.notification_events drop constraint if exists notification_events_kind_check;
alter table public.notification_events add constraint notification_events_kind_check check (kind in (
  'APPOINTMENT_CREATED','APPOINTMENT_STATUS','APPOINTMENT_COMPLETED','APPOINTMENT_NO_SHOW',
  'APPOINTMENT_CANCELLED','BLOCK_CREATED','BLOCK_REMOVED','BUSINESS_UPDATED',
  'PROFESSIONAL_CREATED','PROFESSIONAL_UPDATED','SERVICE_CREATED','SERVICE_UPDATED'
));

commit;
