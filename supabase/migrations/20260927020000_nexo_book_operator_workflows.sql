begin;

alter table public.appointments drop constraint if exists appointments_appointment_source_check;
alter table public.appointments add constraint appointments_appointment_source_check
  check (appointment_source in ('PUBLIC','OWNER','PROFESSIONAL','RECEPTIONIST','ADMIN'));

create or replace function public.mark_commission_paid(p_commission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid; v_before jsonb;
begin
  select ce.business_id, to_jsonb(ce) into v_business_id, v_before
  from public.commission_entries ce
  join public.business_members bm on bm.business_id=ce.business_id and bm.user_id=auth.uid() and bm.role='OWNER'
  where ce.id=p_commission_id and ce.status='PENDING' for update;
  if v_business_id is null then raise exception 'commission_not_found' using errcode='P0002'; end if;
  update public.commission_entries set status='PAID',paid_at=now(),paid_by_user_id=auth.uid() where id=p_commission_id;
  insert into public.financial_audit_logs(business_id,actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(v_business_id,auth.uid(),'COMMISSION_PAID','commission',p_commission_id,v_before,
      (select to_jsonb(ce) from public.commission_entries ce where ce.id=p_commission_id));
end; $$;

create or replace function public.create_waitlist_entry(
  p_customer_name text, p_customer_phone text, p_service_id uuid, p_professional_id uuid,
  p_preferred_date date, p_preferred_period text default 'ANY', p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid; v_customer_id uuid; v_id uuid;
begin
  select bm.business_id into v_business_id from public.business_members bm
    where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_customer_name,''))) < 2 or char_length(trim(coalesce(p_customer_phone,''))) < 8
    or p_preferred_date < current_date or p_preferred_period not in ('MORNING','AFTERNOON','EVENING','ANY')
  then raise exception 'invalid_waitlist_entry' using errcode='22023'; end if;
  if not exists(select 1 from public.services s where s.id=p_service_id and s.business_id=v_business_id and s.active)
    or (p_professional_id is not null and not exists(select 1 from public.professionals p where p.id=p_professional_id and p.business_id=v_business_id and p.active))
  then raise exception 'resource_not_found' using errcode='P0002'; end if;
  insert into public.customers(business_id,name,phone) values(v_business_id,trim(p_customer_name),trim(p_customer_phone))
    on conflict(business_id,phone) do update set name=excluded.name,updated_at=now() returning id into v_customer_id;
  insert into public.waitlist_entries(business_id,customer_id,service_id,professional_id,preferred_date,period,notes,created_by_user_id)
    values(v_business_id,v_customer_id,p_service_id,p_professional_id,p_preferred_date,p_preferred_period,nullif(trim(p_notes),''),auth.uid())
    returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_waitlist_status(p_entry_id uuid, p_status public.waitlist_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.waitlist_entries w set status=p_status,updated_at=now()
  where w.id=p_entry_id and exists(select 1 from public.business_members bm where bm.business_id=w.business_id
    and bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST'));
  if not found then raise exception 'waitlist_entry_not_found' using errcode='P0002'; end if;
end; $$;

create or replace function public.update_appointment_note(p_appointment_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_notes,''))>2000 then raise exception 'note_too_long' using errcode='22001'; end if;
  update public.appointments a set notes=nullif(trim(p_notes),''),updated_at=now() where a.id=p_appointment_id
    and exists(select 1 from public.business_members bm where bm.business_id=a.business_id and bm.user_id=auth.uid()
      and bm.role::text in ('OWNER','RECEPTIONIST'));
  if not found then raise exception 'appointment_not_found' using errcode='P0002'; end if;
end; $$;

create or replace function public.update_customer_notes(p_customer_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_notes,''))>4000 then raise exception 'note_too_long' using errcode='22001'; end if;
  update public.customers c set notes=nullif(trim(p_notes),''),updated_at=now() where c.id=p_customer_id
    and exists(select 1 from public.business_members bm where bm.business_id=c.business_id and bm.user_id=auth.uid()
      and bm.role::text in ('OWNER','RECEPTIONIST'));
  if not found then raise exception 'customer_not_found' using errcode='P0002'; end if;
end; $$;

-- Completion must always use the atomic financial RPC. This legacy endpoint only handles
-- non-financial status transitions and prevents revenue from being bypassed.
create or replace function public.set_appointment_status(
  p_appointment_id uuid, p_status public.appointment_status, p_cancellation_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_operator boolean; v_assigned boolean;
begin
  select exists(select 1 from public.appointments a join public.business_members bm on bm.business_id=a.business_id
      and bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') where a.id=p_appointment_id),
    exists(select 1 from public.appointments a join public.professionals p on p.id=a.professional_id
      and p.user_id=auth.uid() and p.active where a.id=p_appointment_id)
    into v_operator,v_assigned;
  if not v_operator and not v_assigned then raise exception 'appointment_not_found' using errcode='P0002'; end if;
  if p_status='COMPLETED' then raise exception 'use_complete_appointment' using errcode='22023'; end if;
  if v_assigned and not v_operator and p_status not in ('CONFIRMED','NO_SHOW') then raise exception 'status_not_allowed' using errcode='42501'; end if;
  update public.appointments set status=p_status,
    cancelled_at=case when p_status='CANCELLED' then now() else null end,
    cancellation_reason=case when p_status='CANCELLED' then nullif(trim(p_cancellation_reason),'') else null end,
    updated_at=now() where id=p_appointment_id;
end; $$;

revoke all on function public.mark_commission_paid(uuid) from public,anon;
revoke all on function public.create_waitlist_entry(text,text,uuid,uuid,date,text,text) from public,anon;
revoke all on function public.update_waitlist_status(uuid,public.waitlist_status) from public,anon;
grant execute on function public.mark_commission_paid(uuid) to authenticated;
grant execute on function public.create_waitlist_entry(text,text,uuid,uuid,date,text,text) to authenticated;
grant execute on function public.update_waitlist_status(uuid,public.waitlist_status) to authenticated;

commit;
