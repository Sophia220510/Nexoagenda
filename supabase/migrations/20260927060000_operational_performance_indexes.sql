begin;

create index if not exists appointment_tokens_business_idx on public.appointment_action_tokens(business_id);
create index if not exists appointment_items_created_by_idx on public.appointment_items(created_by_user_id);
create index if not exists appointment_items_professional_idx on public.appointment_items(professional_id);
create index if not exists cash_closings_closed_by_idx on public.cash_closings(closed_by_user_id);
create index if not exists commission_entries_appointment_idx on public.commission_entries(appointment_id);
create index if not exists commission_entries_paid_by_idx on public.commission_entries(paid_by_user_id) where paid_by_user_id is not null;
create index if not exists expenses_recorded_by_idx on public.expenses(recorded_by_user_id);
create index if not exists expenses_voided_by_idx on public.expenses(voided_by_user_id) where voided_by_user_id is not null;
create index if not exists financial_audit_actor_idx on public.financial_audit_logs(actor_user_id);
create index if not exists notification_queue_business_idx on public.notification_queue(business_id);
create index if not exists notification_queue_customer_idx on public.notification_queue(customer_id) where customer_id is not null;
create index if not exists payments_recorded_by_idx on public.payments(recorded_by_user_id);
create index if not exists payments_voided_by_idx on public.payments(voided_by_user_id) where voided_by_user_id is not null;
create index if not exists commission_rules_business_idx on public.professional_commission_rules(business_id);
create index if not exists commission_rules_service_idx on public.professional_commission_rules(service_id) where service_id is not null;
create index if not exists waitlist_booked_appointment_idx on public.waitlist_entries(booked_appointment_id) where booked_appointment_id is not null;
create index if not exists waitlist_created_by_idx on public.waitlist_entries(created_by_user_id);
create index if not exists waitlist_professional_idx on public.waitlist_entries(professional_id) where professional_id is not null;
create index if not exists waitlist_service_idx on public.waitlist_entries(service_id);

drop policy if exists appointments_select_platform_admin on public.appointments;
drop policy if exists customers_select_platform_admin on public.customers;
drop policy if exists appointments_select_scoped on public.appointments;
create policy appointments_select_scoped on public.appointments for select to authenticated using (
  private.is_platform_admin((select auth.uid())) or private.is_business_operator(business_id)
  or private.is_current_professional(professional_id,business_id)
);
drop policy if exists customers_select_scoped on public.customers;
create policy customers_select_scoped on public.customers for select to authenticated using (
  private.is_platform_admin((select auth.uid())) or private.is_business_operator(business_id)
  or exists(select 1 from public.appointments a where a.customer_id=customers.id
    and private.is_current_professional(a.professional_id,a.business_id))
);
drop policy if exists financial_audit_select_owner on public.financial_audit_logs;
create policy financial_audit_select_owner on public.financial_audit_logs for select to authenticated using (
  private.is_platform_admin((select auth.uid())) or private.is_business_owner(business_id)
);

commit;
