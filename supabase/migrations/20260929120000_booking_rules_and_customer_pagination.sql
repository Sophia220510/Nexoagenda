begin;

-- Public booking rules are explicit per business. Defaults preserve the
-- current behaviour while allowing owners to make the operation stricter.
alter table public.businesses
  add column if not exists min_booking_notice_minutes integer not null default 0,
  add column if not exists max_booking_days_ahead integer not null default 90;

alter table public.businesses drop constraint if exists businesses_booking_notice_check;
alter table public.businesses add constraint businesses_booking_notice_check
  check (min_booking_notice_minutes between 0 and 10080);
alter table public.businesses drop constraint if exists businesses_booking_horizon_check;
alter table public.businesses add constraint businesses_booking_horizon_check
  check (max_booking_days_ahead between 1 and 365);

create or replace function public.get_public_business(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',b.id,'name',b.name,'slug',b.slug,'phone',b.phone,'logo_url',b.logo_url,
    'timezone',b.timezone,'description',b.description,'address',b.address,
    'instagram_url',b.instagram_url,'slot_interval_minutes',b.slot_interval_minutes,
    'min_booking_notice_minutes',b.min_booking_notice_minutes,
    'max_booking_days_ahead',b.max_booking_days_ahead,
    'professionals',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'photo_url',p.photo_url,'bio',p.bio,
      'whatsapp_phone',case when p.receive_booking_whatsapp then p.whatsapp_phone end,
      'receive_booking_whatsapp',p.receive_booking_whatsapp,
      'service_ids',coalesce((select jsonb_agg(ps.service_id) from public.professional_services ps
        join public.services s on s.id=ps.service_id and s.business_id=ps.business_id
        where ps.professional_id=p.id and ps.active and s.active),'[]'::jsonb),
      'service_durations',coalesce((select jsonb_object_agg(
        ps.service_id,coalesce(ps.duration_override_minutes,s.default_duration_minutes))
        from public.professional_services ps
        join public.services s on s.id=ps.service_id and s.business_id=ps.business_id
        where ps.professional_id=p.id and ps.active and s.active),'{}'::jsonb),
      'service_prices',coalesce((select jsonb_object_agg(
        ps.service_id,coalesce(ps.price_override_cents,s.price_cents))
        from public.professional_services ps
        join public.services s on s.id=ps.service_id and s.business_id=ps.business_id
        where ps.professional_id=p.id and ps.active and s.active),'{}'::jsonb)) order by p.name)
      from public.professionals p where p.business_id=b.id and p.active),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'category',s.category,'description',s.description,'price_cents',s.price_cents,
      'default_duration_minutes',s.default_duration_minutes) order by s.name)
      from public.services s where s.business_id=b.id and s.active),'[]'::jsonb)
  ) from public.businesses b where b.slug=lower(trim(p_slug)) and b.active;
$$;

create or replace function public.get_public_availability(
  p_slug text, p_professional_id uuid, p_service_id uuid, p_date date
)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with booking_context as (
    select b.id as business_id, b.timezone, b.slot_interval_minutes,
      b.min_booking_notice_minutes, b.max_booking_days_ahead,
      coalesce(ps.duration_override_minutes, s.default_duration_minutes) as duration_minutes
    from public.businesses b
    join public.professionals p on p.business_id=b.id and p.id=p_professional_id and p.active
    join public.services s on s.business_id=b.id and s.id=p_service_id and s.active
    join public.professional_services ps on ps.business_id=b.id
      and ps.professional_id=p.id and ps.service_id=s.id and ps.active
    where b.slug=lower(trim(p_slug)) and b.active
  ), candidates as (
    select generate_series(
      (p_date+wh.start_time) at time zone bc.timezone,
      ((p_date+wh.end_time) at time zone bc.timezone)-make_interval(mins=>bc.duration_minutes),
      make_interval(mins=>bc.slot_interval_minutes)
    ) as slot_start, bc.*
    from booking_context bc
    join public.working_hours wh on wh.business_id=bc.business_id
      and wh.professional_id=p_professional_id
      and wh.weekday=extract(dow from p_date)::smallint and wh.active
    where p_date between (now() at time zone bc.timezone)::date
      and (now() at time zone bc.timezone)::date+bc.max_booking_days_ahead
  )
  select distinct c.slot_start
  from candidates c
  where c.slot_start>=now()+make_interval(mins=>c.min_booking_notice_minutes)
    and not exists (
      select 1 from public.appointments a
      where a.business_id=c.business_id and a.professional_id=p_professional_id
        and a.status<>'CANCELLED'
        and tstzrange(a.starts_at,a.ends_at,'[)') &&
          tstzrange(c.slot_start,c.slot_start+make_interval(mins=>c.duration_minutes),'[)')
    )
    and not exists (
      select 1 from public.blocked_times bt
      where bt.business_id=c.business_id and bt.professional_id=p_professional_id
        and tstzrange(bt.starts_at,bt.ends_at,'[)') &&
          tstzrange(c.slot_start,c.slot_start+make_interval(mins=>c.duration_minutes),'[)')
    )
    and not exists (
      select 1 from public.recurring_blocks rb
      where rb.business_id=c.business_id and rb.professional_id=p_professional_id and rb.active
        and rb.weekday=extract(dow from p_date)::smallint
        and tstzrange((p_date+rb.start_time) at time zone c.timezone,
          (p_date+rb.end_time) at time zone c.timezone,'[)') &&
          tstzrange(c.slot_start,c.slot_start+make_interval(mins=>c.duration_minutes),'[)')
    )
  order by c.slot_start;
$$;

create or replace function public.book_public_appointment(
  p_slug text, p_professional_id uuid, p_service_id uuid,
  p_starts_at timestamptz, p_customer_name text, p_customer_phone text,
  p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid; v_timezone text; v_duration integer; v_price integer; v_interval integer;
  v_notice integer; v_horizon integer; v_ends_at timestamptz;
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
  if extract(minute from (p_starts_at at time zone v_timezone))::integer%v_interval<>0
    or extract(second from (p_starts_at at time zone v_timezone))<>0
  then raise exception 'invalid_slot_granularity' using errcode='22007'; end if;
  if not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
    and wh.professional_id=p_professional_id and wh.active
    and wh.weekday=extract(dow from v_local_date)::smallint
    and v_local_date=(v_ends_at at time zone v_timezone)::date
    and (p_starts_at at time zone v_timezone)::time>=wh.start_time
    and (v_ends_at at time zone v_timezone)::time<=wh.end_time)
  then raise exception 'outside_working_hours' using errcode='22007'; end if;
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
  if extract(minute from (p_starts_at at time zone v_timezone))::integer%v_interval<>0
    or extract(second from (p_starts_at at time zone v_timezone))<>0
  then raise exception 'invalid_slot_granularity' using errcode='22007'; end if;
  if not exists(select 1 from public.working_hours wh where wh.business_id=v_business_id
    and wh.professional_id=p_professional_id and wh.active
    and wh.weekday=extract(dow from v_local_date)::smallint
    and v_local_date=(v_ends_at at time zone v_timezone)::date
    and (p_starts_at at time zone v_timezone)::time>=wh.start_time
    and (v_ends_at at time zone v_timezone)::time<=wh.end_time)
  then raise exception 'outside_working_hours' using errcode='22007'; end if;
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

-- Server-side customer summary keeps the CRM fast as the customer base grows.
create or replace function public.list_customers_summary(
  p_search text default '', p_sort text default 'name', p_page integer default 1,
  p_page_size integer default 25
) returns table(
  id uuid, name text, phone text, last_visit timestamptz, next_appointment timestamptz,
  completed_visits bigint, realized_value_cents bigint, total_count bigint
) language plpgsql stable security definer set search_path = '' as $$
declare v_business_id uuid; v_offset integer;
begin
  select bm.business_id into v_business_id from public.business_members bm
  where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;
  v_offset:=(greatest(p_page,1)-1)*least(greatest(p_page_size,1),100);
  return query
  with summary as (
    select c.id,c.name,c.phone,
      max(a.starts_at) filter(where a.status='COMPLETED') as last_visit,
      min(a.starts_at) filter(where a.status='CONFIRMED' and a.starts_at>=now()) as next_appointment,
      count(a.id) filter(where a.status='COMPLETED') as completed_visits,
      coalesce(sum(coalesce(a.realized_total_cents,a.price_cents_snapshot,s.price_cents,0))
        filter(where a.status='COMPLETED'),0)::bigint as realized_value_cents
    from public.customers c
    left join public.appointments a on a.customer_id=c.id and a.business_id=c.business_id
    left join public.services s on s.id=a.service_id and s.business_id=a.business_id
    where c.business_id=v_business_id and (
      nullif(trim(p_search),'') is null
      or c.name ilike '%'||trim(p_search)||'%'
      or (nullif(regexp_replace(p_search,'\D','','g'),'') is not null
        and c.phone like '%'||regexp_replace(p_search,'\D','','g')||'%')
    ) group by c.id,c.name,c.phone
  )
  select s.id,s.name,s.phone,s.last_visit,s.next_appointment,s.completed_visits,
    s.realized_value_cents,count(*) over() as total_count
  from summary s
  order by
    case when p_sort='recent' then s.last_visit end desc nulls last,
    case when p_sort='visits' then s.completed_visits end desc,
    case when p_sort='name' or p_sort not in ('recent','visits') then lower(s.name) end,
    s.id
  limit least(greatest(p_page_size,1),100) offset v_offset;
end; $$;

create index if not exists customers_business_name_id_idx on public.customers(business_id,name,id);
create index if not exists appointments_business_customer_status_starts_idx
  on public.appointments(business_id,customer_id,status,starts_at);

revoke all on function public.get_public_business(text) from public,authenticated;
revoke all on function public.get_public_availability(text,uuid,uuid,date) from public,authenticated;
revoke all on function public.book_public_appointment(text,uuid,uuid,timestamptz,text,text,uuid) from public,authenticated;
grant execute on function public.get_public_business(text) to anon;
grant execute on function public.get_public_availability(text,uuid,uuid,date) to anon;
grant execute on function public.book_public_appointment(text,uuid,uuid,timestamptz,text,text,uuid) to anon;
revoke all on function public.list_customers_summary(text,text,integer,integer) from public,anon;
grant execute on function public.list_customers_summary(text,text,integer,integer) to authenticated;

commit;
