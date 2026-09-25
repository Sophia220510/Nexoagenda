begin;

alter table public.appointments
  add column if not exists price_cents_snapshot integer check (price_cents_snapshot is null or price_cents_snapshot >= 0),
  add column if not exists duration_minutes_snapshot integer check (duration_minutes_snapshot is null or duration_minutes_snapshot between 5 and 720),
  add column if not exists appointment_source text not null default 'PUBLIC'
    check (appointment_source in ('PUBLIC', 'OWNER', 'PROFESSIONAL', 'ADMIN')),
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500);

alter table public.customers
  add column if not exists notes text check (notes is null or char_length(notes) <= 4000);

create index if not exists appointments_customer_business_starts_idx
  on public.appointments (customer_id, business_id, starts_at desc);
create index if not exists appointments_business_status_starts_idx
  on public.appointments (business_id, status, starts_at);
create index if not exists appointments_created_by_idx
  on public.appointments (created_by_user_id) where created_by_user_id is not null;

-- Existing appointments intentionally keep null snapshots: their historical price cannot
-- be reconstructed reliably. All appointments created after this migration are snapshotted.
create or replace function public.book_public_appointment(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid; v_timezone text; v_duration integer; v_price integer;
  v_ends_at timestamptz; v_customer_id uuid; v_appointment_id uuid;
  v_local_date date;
begin
  select b.id, b.timezone,
    coalesce(ps.duration_override_minutes, s.default_duration_minutes),
    coalesce(ps.price_override_cents, s.price_cents)
  into v_business_id, v_timezone, v_duration, v_price
  from public.businesses b
  join public.professionals p on p.business_id = b.id and p.id = p_professional_id and p.active
  join public.services s on s.business_id = b.id and s.id = p_service_id and s.active
  join public.professional_services ps on ps.business_id = b.id
    and ps.professional_id = p.id and ps.service_id = s.id and ps.active
  where b.slug = lower(trim(p_slug)) and b.active;
  if v_business_id is null then raise exception 'booking_resource_not_found' using errcode = 'P0002'; end if;
  if p_starts_at <= now() then raise exception 'appointment_must_be_in_future' using errcode = '22007'; end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_local_date := (p_starts_at at time zone v_timezone)::date;

  if not exists (
    select 1 from public.working_hours wh
    where wh.business_id = v_business_id and wh.professional_id = p_professional_id and wh.active
      and wh.weekday = extract(dow from v_local_date)::smallint
      and v_local_date = (v_ends_at at time zone v_timezone)::date
      and (p_starts_at at time zone v_timezone)::time >= wh.start_time
      and (v_ends_at at time zone v_timezone)::time <= wh.end_time
  ) then raise exception 'outside_working_hours' using errcode = '22007'; end if;

  if extract(minute from (p_starts_at at time zone v_timezone))::integer % public.slot_granularity_minutes() <> 0
    or extract(second from (p_starts_at at time zone v_timezone)) <> 0 then
    raise exception 'invalid_slot_granularity' using errcode = '22007';
  end if;

  if exists (
    select 1 from public.blocked_times bt where bt.business_id = v_business_id
      and bt.professional_id = p_professional_id
      and tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then raise exception 'blocked_time' using errcode = '23P01'; end if;

  if exists (
    select 1 from public.recurring_blocks rb where rb.business_id = v_business_id
      and rb.professional_id = p_professional_id and rb.active
      and rb.weekday = extract(dow from v_local_date)::smallint
      and tstzrange((v_local_date + rb.start_time) at time zone v_timezone,
        (v_local_date + rb.end_time) at time zone v_timezone, '[)')
        && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then raise exception 'recurring_block' using errcode = '23P01'; end if;

  insert into public.customers (business_id, name, phone)
  values (v_business_id, trim(p_customer_name), p_customer_phone)
  on conflict (business_id, phone) do update set name = excluded.name, updated_at = now()
  returning id into v_customer_id;

  insert into public.appointments (
    business_id, professional_id, service_id, customer_id, starts_at, ends_at,
    status, public_idempotency_key, price_cents_snapshot, duration_minutes_snapshot,
    appointment_source
  ) values (
    v_business_id, p_professional_id, p_service_id, v_customer_id, p_starts_at, v_ends_at,
    'CONFIRMED', p_idempotency_key, v_price, v_duration, 'PUBLIC'
  )
  on conflict (business_id, public_idempotency_key)
    where public_idempotency_key is not null do nothing
  returning id into v_appointment_id;

  if v_appointment_id is null then
    select a.id into v_appointment_id from public.appointments a
    where a.business_id = v_business_id and a.public_idempotency_key = p_idempotency_key;
  end if;
  return v_appointment_id;
end;
$$;

create or replace function public.book_internal_appointment(
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid; v_timezone text; v_duration integer; v_price integer;
  v_ends_at timestamptz; v_customer_id uuid; v_appointment_id uuid; v_local_date date;
begin
  select bm.business_id, b.timezone
    into v_business_id, v_timezone
  from public.business_members bm
  join public.businesses b on b.id = bm.business_id and b.active
  where bm.user_id = auth.uid() and bm.role = 'OWNER'
  limit 1;
  if v_business_id is null then raise exception 'owner_required' using errcode = '42501'; end if;

  select coalesce(ps.duration_override_minutes, s.default_duration_minutes),
         coalesce(ps.price_override_cents, s.price_cents)
    into v_duration, v_price
  from public.professionals p
  join public.services s on s.business_id = p.business_id and s.id = p_service_id and s.active
  join public.professional_services ps on ps.business_id = p.business_id
    and ps.professional_id = p.id and ps.service_id = s.id and ps.active
  where p.id = p_professional_id and p.business_id = v_business_id and p.active;
  if v_duration is null then raise exception 'booking_resource_not_found' using errcode = 'P0002'; end if;
  if p_starts_at <= now() then raise exception 'appointment_must_be_in_future' using errcode = '22007'; end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_local_date := (p_starts_at at time zone v_timezone)::date;
  if not exists (
    select 1 from public.working_hours wh
    where wh.business_id = v_business_id and wh.professional_id = p_professional_id and wh.active
      and wh.weekday = extract(dow from v_local_date)::smallint
      and v_local_date = (v_ends_at at time zone v_timezone)::date
      and (p_starts_at at time zone v_timezone)::time >= wh.start_time
      and (v_ends_at at time zone v_timezone)::time <= wh.end_time
  ) then raise exception 'outside_working_hours' using errcode = '22007'; end if;
  if extract(minute from (p_starts_at at time zone v_timezone))::integer % public.slot_granularity_minutes() <> 0
    or extract(second from (p_starts_at at time zone v_timezone)) <> 0 then
    raise exception 'invalid_slot_granularity' using errcode = '22007';
  end if;
  if exists (select 1 from public.blocked_times bt where bt.business_id = v_business_id
    and bt.professional_id = p_professional_id
    and tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)'))
  then raise exception 'blocked_time' using errcode = '23P01'; end if;
  if exists (select 1 from public.recurring_blocks rb where rb.business_id = v_business_id
    and rb.professional_id = p_professional_id and rb.active
    and rb.weekday = extract(dow from v_local_date)::smallint
    and tstzrange((v_local_date + rb.start_time) at time zone v_timezone,
      (v_local_date + rb.end_time) at time zone v_timezone, '[)')
      && tstzrange(p_starts_at, v_ends_at, '[)'))
  then raise exception 'recurring_block' using errcode = '23P01'; end if;

  if p_customer_id is not null then
    select c.id into v_customer_id from public.customers c
      where c.id = p_customer_id and c.business_id = v_business_id;
    if v_customer_id is null then raise exception 'customer_not_found' using errcode = 'P0002'; end if;
  else
    if char_length(trim(coalesce(p_customer_name, ''))) < 2 or p_customer_phone is null then
      raise exception 'customer_required' using errcode = '22023';
    end if;
    insert into public.customers (business_id, name, phone)
      values (v_business_id, trim(p_customer_name), p_customer_phone)
      on conflict (business_id, phone) do update set name = excluded.name, updated_at = now()
      returning id into v_customer_id;
  end if;

  insert into public.appointments (
    business_id, professional_id, service_id, customer_id, starts_at, ends_at,
    status, notes, price_cents_snapshot, duration_minutes_snapshot,
    appointment_source, created_by_user_id
  ) values (
    v_business_id, p_professional_id, p_service_id, v_customer_id, p_starts_at, v_ends_at,
    'CONFIRMED', nullif(trim(p_notes), ''), v_price, v_duration, 'OWNER', auth.uid()
  ) returning id into v_appointment_id;
  return v_appointment_id;
end;
$$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid; v_timezone text; v_service_id uuid; v_duration integer;
  v_ends_at timestamptz; v_local_date date;
begin
  select a.business_id, b.timezone, a.service_id,
    coalesce(a.duration_minutes_snapshot, ps.duration_override_minutes, s.default_duration_minutes)
  into v_business_id, v_timezone, v_service_id, v_duration
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  join public.business_members bm on bm.business_id = a.business_id and bm.user_id = auth.uid() and bm.role = 'OWNER'
  join public.services s on s.id = a.service_id and s.business_id = a.business_id
  left join public.professional_services ps on ps.business_id = a.business_id
    and ps.professional_id = p_professional_id and ps.service_id = a.service_id and ps.active
  where a.id = p_appointment_id and a.status <> 'CANCELLED';
  if v_business_id is null or v_duration is null then raise exception 'appointment_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.professionals p where p.id = p_professional_id and p.business_id = v_business_id and p.active)
    or not exists (select 1 from public.professional_services ps where ps.professional_id = p_professional_id
      and ps.service_id = v_service_id and ps.business_id = v_business_id and ps.active)
  then raise exception 'professional_unavailable' using errcode = 'P0002'; end if;
  if p_starts_at <= now() then raise exception 'appointment_must_be_in_future' using errcode = '22007'; end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_local_date := (p_starts_at at time zone v_timezone)::date;
  if not exists (select 1 from public.working_hours wh where wh.business_id = v_business_id
    and wh.professional_id = p_professional_id and wh.active
    and wh.weekday = extract(dow from v_local_date)::smallint
    and v_local_date = (v_ends_at at time zone v_timezone)::date
    and (p_starts_at at time zone v_timezone)::time >= wh.start_time
    and (v_ends_at at time zone v_timezone)::time <= wh.end_time)
  then raise exception 'outside_working_hours' using errcode = '22007'; end if;
  if exists (select 1 from public.blocked_times bt where bt.business_id = v_business_id
    and bt.professional_id = p_professional_id
    and tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)'))
  then raise exception 'blocked_time' using errcode = '23P01'; end if;
  if exists (select 1 from public.recurring_blocks rb where rb.business_id = v_business_id
    and rb.professional_id = p_professional_id and rb.active
    and rb.weekday = extract(dow from v_local_date)::smallint
    and tstzrange((v_local_date + rb.start_time) at time zone v_timezone,
      (v_local_date + rb.end_time) at time zone v_timezone, '[)')
      && tstzrange(p_starts_at, v_ends_at, '[)'))
  then raise exception 'recurring_block' using errcode = '23P01'; end if;

  update public.appointments set professional_id = p_professional_id, starts_at = p_starts_at,
    ends_at = v_ends_at, updated_at = now()
  where id = p_appointment_id and business_id = v_business_id;
end;
$$;

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
begin
  if not exists (
    select 1 from public.appointments a
    join public.business_members bm on bm.business_id = a.business_id
      and bm.user_id = auth.uid() and bm.role = 'OWNER'
    where a.id = p_appointment_id
  ) then raise exception 'appointment_not_found' using errcode = 'P0002'; end if;
  update public.appointments set status = p_status,
    cancelled_at = case when p_status = 'CANCELLED' then now() else null end,
    cancellation_reason = case when p_status = 'CANCELLED' then nullif(trim(p_cancellation_reason), '') else null end,
    updated_at = now()
  where id = p_appointment_id;
end;
$$;

revoke all on function public.book_internal_appointment(uuid, uuid, timestamptz, uuid, text, text, text) from public, anon;
revoke all on function public.reschedule_appointment(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.set_appointment_status(uuid, public.appointment_status, text) from public, anon;
grant execute on function public.book_internal_appointment(uuid, uuid, timestamptz, uuid, text, text, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.set_appointment_status(uuid, public.appointment_status, text) to authenticated;

commit;
