begin;

-- Slot alignment is relative to each working-hours range. This supports, for
-- example, a 20-minute grid beginning at 08:30 (08:30, 08:50, 09:10...).
create or replace function public.book_public_appointment(
  p_slug text, p_professional_id uuid, p_service_id uuid,
  p_starts_at timestamptz, p_customer_name text, p_customer_phone text,
  p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid; v_timezone text; v_duration integer; v_price integer;
  v_interval integer; v_notice integer; v_horizon integer; v_ends_at timestamptz;
  v_customer_id uuid; v_appointment_id uuid; v_local_date date; v_today date;
begin
  select b.id,b.timezone,coalesce(ps.duration_override_minutes,s.default_duration_minutes),
    coalesce(ps.price_override_cents,s.price_cents),b.slot_interval_minutes,
    b.min_booking_notice_minutes,b.max_booking_days_ahead
  into v_business_id,v_timezone,v_duration,v_price,v_interval,v_notice,v_horizon
  from public.businesses b
  join public.professionals p on p.business_id=b.id and p.id=p_professional_id and p.active
  join public.services s on s.business_id=b.id and s.id=p_service_id and s.active
  join public.professional_services ps on ps.business_id=b.id
    and ps.professional_id=p.id and ps.service_id=s.id and ps.active
  where b.slug=lower(trim(p_slug)) and b.active;
  if v_business_id is null then raise exception 'booking_resource_not_found' using errcode='P0002'; end if;
  if p_starts_at<now()+make_interval(mins=>v_notice) then
    raise exception 'minimum_booking_notice' using errcode='22007';
  end if;
  v_ends_at:=p_starts_at+make_interval(mins=>v_duration);
  v_local_date:=(p_starts_at at time zone v_timezone)::date;
  v_today:=(now() at time zone v_timezone)::date;
  if v_local_date>v_today+v_horizon then raise exception 'booking_horizon_exceeded' using errcode='22007'; end if;

  if not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
    and wh.professional_id=p_professional_id and wh.active
    and wh.weekday=extract(dow from v_local_date)::smallint
    and v_local_date=(v_ends_at at time zone v_timezone)::date
    and (p_starts_at at time zone v_timezone)::time>=wh.start_time
    and (v_ends_at at time zone v_timezone)::time<=wh.end_time)
  then raise exception 'outside_working_hours' using errcode='22007'; end if;

  if extract(second from (p_starts_at at time zone v_timezone))<>0
    or not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
      and wh.professional_id=p_professional_id and wh.active
      and wh.weekday=extract(dow from v_local_date)::smallint
      and (p_starts_at at time zone v_timezone)::time>=wh.start_time
      and (v_ends_at at time zone v_timezone)::time<=wh.end_time
      and mod((extract(epoch from (
        (p_starts_at at time zone v_timezone)::time-wh.start_time
      ))/60)::integer,v_interval)=0)
  then raise exception 'invalid_slot_granularity' using errcode='22007'; end if;

  if exists(select 1 from public.blocked_times bt where bt.business_id=v_business_id
    and bt.professional_id=p_professional_id
    and tstzrange(bt.starts_at,bt.ends_at,'[)')&&tstzrange(p_starts_at,v_ends_at,'[)'))
  then raise exception 'blocked_time' using errcode='23P01'; end if;
  if exists(select 1 from public.recurring_blocks rb where rb.business_id=v_business_id
    and rb.professional_id=p_professional_id and rb.active
    and rb.weekday=extract(dow from v_local_date)::smallint
    and tstzrange((v_local_date+rb.start_time) at time zone v_timezone,
      (v_local_date+rb.end_time) at time zone v_timezone,'[)')&&tstzrange(p_starts_at,v_ends_at,'[)'))
  then raise exception 'recurring_block' using errcode='23P01'; end if;

  insert into public.customers(business_id,name,phone)
  values(v_business_id,trim(p_customer_name),p_customer_phone)
  on conflict(business_id,phone) do update set name=excluded.name,updated_at=now()
  returning id into v_customer_id;
  insert into public.appointments(business_id,professional_id,service_id,customer_id,
    starts_at,ends_at,status,public_idempotency_key,price_cents_snapshot,
    duration_minutes_snapshot,appointment_source)
  values(v_business_id,p_professional_id,p_service_id,v_customer_id,
    p_starts_at,v_ends_at,'CONFIRMED',p_idempotency_key,v_price,v_duration,'PUBLIC')
  on conflict(business_id,public_idempotency_key) where public_idempotency_key is not null do nothing
  returning id into v_appointment_id;
  if v_appointment_id is null then
    select a.id into v_appointment_id from public.appointments a
    where a.business_id=v_business_id and a.public_idempotency_key=p_idempotency_key;
  end if;
  return v_appointment_id;
end; $$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid, p_professional_id uuid, p_starts_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid; v_timezone text; v_service_id uuid; v_duration integer;
  v_interval integer; v_ends_at timestamptz; v_local_date date; v_before jsonb;
begin
  select a.business_id,b.timezone,a.service_id,
    coalesce(a.duration_minutes_snapshot,ps.duration_override_minutes,s.default_duration_minutes),
    b.slot_interval_minutes,to_jsonb(a)
  into v_business_id,v_timezone,v_service_id,v_duration,v_interval,v_before
  from public.appointments a
  join public.businesses b on b.id=a.business_id
  join public.business_members bm on bm.business_id=a.business_id and bm.user_id=auth.uid()
    and bm.role::text in ('OWNER','RECEPTIONIST')
  join public.services s on s.id=a.service_id and s.business_id=a.business_id
  left join public.professional_services ps on ps.business_id=a.business_id
    and ps.professional_id=p_professional_id and ps.service_id=a.service_id and ps.active
  where a.id=p_appointment_id and a.status='CONFIRMED' for update of a;
  if v_business_id is null or v_duration is null then
    raise exception 'appointment_not_found' using errcode='P0002';
  end if;
  if not exists(select 1 from public.professionals p where p.id=p_professional_id
      and p.business_id=v_business_id and p.active)
    or not exists(select 1 from public.professional_services ps where ps.professional_id=p_professional_id
      and ps.service_id=v_service_id and ps.business_id=v_business_id and ps.active)
  then raise exception 'professional_unavailable' using errcode='P0002'; end if;
  if p_starts_at<=now() then raise exception 'appointment_must_be_in_future' using errcode='22007'; end if;
  v_ends_at:=p_starts_at+make_interval(mins=>v_duration);
  v_local_date:=(p_starts_at at time zone v_timezone)::date;

  if not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
    and wh.professional_id=p_professional_id and wh.active
    and wh.weekday=extract(dow from v_local_date)::smallint
    and v_local_date=(v_ends_at at time zone v_timezone)::date
    and (p_starts_at at time zone v_timezone)::time>=wh.start_time
    and (v_ends_at at time zone v_timezone)::time<=wh.end_time)
  then raise exception 'outside_working_hours' using errcode='22007'; end if;

  if extract(second from (p_starts_at at time zone v_timezone))<>0
    or not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
      and wh.professional_id=p_professional_id and wh.active
      and wh.weekday=extract(dow from v_local_date)::smallint
      and (p_starts_at at time zone v_timezone)::time>=wh.start_time
      and (v_ends_at at time zone v_timezone)::time<=wh.end_time
      and mod((extract(epoch from (
        (p_starts_at at time zone v_timezone)::time-wh.start_time
      ))/60)::integer,v_interval)=0)
  then raise exception 'invalid_slot_granularity' using errcode='22007'; end if;

  if exists(select 1 from public.blocked_times bt where bt.business_id=v_business_id
    and bt.professional_id=p_professional_id
    and tstzrange(bt.starts_at,bt.ends_at,'[)')&&tstzrange(p_starts_at,v_ends_at,'[)'))
  then raise exception 'blocked_time' using errcode='23P01'; end if;
  if exists(select 1 from public.recurring_blocks rb where rb.business_id=v_business_id
    and rb.professional_id=p_professional_id and rb.active
    and rb.weekday=extract(dow from v_local_date)::smallint
    and tstzrange((v_local_date+rb.start_time) at time zone v_timezone,
      (v_local_date+rb.end_time) at time zone v_timezone,'[)')&&tstzrange(p_starts_at,v_ends_at,'[)'))
  then raise exception 'recurring_block' using errcode='23P01'; end if;
  update public.appointments set professional_id=p_professional_id,starts_at=p_starts_at,
    ends_at=v_ends_at,updated_at=now() where id=p_appointment_id and business_id=v_business_id;
  insert into public.financial_audit_logs(
    business_id,actor_user_id,action,entity_type,entity_id,before_data,after_data
  ) values(v_business_id,auth.uid(),'APPOINTMENT_RESCHEDULED','appointment',p_appointment_id,
    v_before,(select to_jsonb(a) from public.appointments a where a.id=p_appointment_id));
end; $$;

revoke all on function public.book_public_appointment(text,uuid,uuid,timestamptz,text,text,uuid)
  from public,authenticated;
grant execute on function public.book_public_appointment(text,uuid,uuid,timestamptz,text,text,uuid)
  to anon;
revoke all on function public.reschedule_appointment(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.reschedule_appointment(uuid,uuid,timestamptz) to authenticated;

commit;
