begin;

create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_cancellation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
  v_is_assigned_professional boolean;
begin
  select
    exists (
      select 1
      from public.appointments a
      join public.business_members bm
        on bm.business_id = a.business_id
       and bm.user_id = auth.uid()
       and bm.role = 'OWNER'
      where a.id = p_appointment_id
    ),
    exists (
      select 1
      from public.appointments a
      join public.professionals p
        on p.id = a.professional_id
       and p.business_id = a.business_id
       and p.user_id = auth.uid()
       and p.active
      where a.id = p_appointment_id
    )
  into v_is_owner, v_is_assigned_professional;

  if not v_is_owner and not v_is_assigned_professional then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;

  if v_is_assigned_professional and not v_is_owner
     and p_status not in ('CONFIRMED', 'COMPLETED', 'NO_SHOW') then
    raise exception 'status_not_allowed' using errcode = '42501';
  end if;

  update public.appointments
  set status = p_status,
      cancelled_at = case when p_status = 'CANCELLED' then now() else null end,
      cancellation_reason = case
        when p_status = 'CANCELLED' then nullif(trim(p_cancellation_reason), '')
        else null
      end,
      updated_at = now()
  where id = p_appointment_id;
end;
$$;

revoke all on function public.set_appointment_status(uuid, public.appointment_status, text) from public, anon;
grant execute on function public.set_appointment_status(uuid, public.appointment_status, text) to authenticated;

create index if not exists admin_audit_logs_actor_user_idx
  on public.admin_audit_logs (actor_user_id);
create index if not exists appointments_professional_business_idx
  on public.appointments (professional_id, business_id);
create index if not exists appointments_service_business_idx
  on public.appointments (service_id, business_id);
create index if not exists blocked_times_business_idx
  on public.blocked_times (business_id);
create index if not exists blocked_times_created_by_idx
  on public.blocked_times (created_by);
create index if not exists blocked_times_professional_business_idx
  on public.blocked_times (professional_id, business_id);
create index if not exists platform_admins_created_by_idx
  on public.platform_admins (created_by);
create index if not exists professional_services_business_idx
  on public.professional_services (business_id);
create index if not exists professional_services_professional_business_idx
  on public.professional_services (professional_id, business_id);
create index if not exists professional_services_service_business_idx
  on public.professional_services (service_id, business_id);
create index if not exists recurring_blocks_business_idx
  on public.recurring_blocks (business_id);
create index if not exists recurring_blocks_professional_business_idx
  on public.recurring_blocks (professional_id, business_id);
create index if not exists working_hours_business_idx
  on public.working_hours (business_id);
create index if not exists working_hours_professional_business_idx
  on public.working_hours (professional_id, business_id);

commit;
