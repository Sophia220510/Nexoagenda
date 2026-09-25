create index notification_events_professional_business_idx
  on public.notification_events(professional_id, business_id)
  where professional_id is not null;
