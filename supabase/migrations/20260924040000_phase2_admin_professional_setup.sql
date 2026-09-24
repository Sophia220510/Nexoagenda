begin;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  active boolean not null default true
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  action text not null check (char_length(action) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 3 and 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.recurring_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  reason text check (reason is null or char_length(reason) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (start_time < end_time),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete restrict
);

alter table public.professionals
  add column setup_completed_at timestamptz;

create index platform_admins_active_idx on public.platform_admins(user_id) where active;
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_business_idx on public.admin_audit_logs(business_id, created_at desc);
create index recurring_blocks_professional_weekday_idx
  on public.recurring_blocks(professional_id, weekday) where active;

create or replace function private.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = p_user_id and pa.active
  );
$$;

revoke all on function private.is_platform_admin(uuid) from public, anon;
grant execute on function private.is_platform_admin(uuid) to authenticated;

alter table public.platform_admins enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.recurring_blocks enable row level security;

create policy platform_admins_select_self on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));
create policy platform_admins_select_admin on public.platform_admins for select to authenticated
using (private.is_platform_admin((select auth.uid())));

create policy admin_audit_logs_select_admin on public.admin_audit_logs for select to authenticated
using (private.is_platform_admin((select auth.uid())));

create policy recurring_blocks_select_scoped on public.recurring_blocks for select to authenticated
using (
  private.is_platform_admin((select auth.uid()))
  or private.is_business_owner(business_id)
  or private.is_current_professional(professional_id, business_id)
);
create policy recurring_blocks_insert_scoped on public.recurring_blocks for insert to authenticated
with check (
  private.is_business_owner(business_id)
  or private.is_current_professional(professional_id, business_id)
);
create policy recurring_blocks_update_scoped on public.recurring_blocks for update to authenticated
using (
  private.is_business_owner(business_id)
  or private.is_current_professional(professional_id, business_id)
)
with check (
  private.is_business_owner(business_id)
  or private.is_current_professional(professional_id, business_id)
);
create policy recurring_blocks_delete_scoped on public.recurring_blocks for delete to authenticated
using (
  private.is_business_owner(business_id)
  or private.is_current_professional(professional_id, business_id)
);

-- PLATFORM_ADMIN receives explicit cross-tenant read access and only the
-- updates needed for support. No destructive DELETE policy is introduced.
create policy profiles_select_platform_admin on public.profiles for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy businesses_select_platform_admin on public.businesses for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy business_members_select_platform_admin on public.business_members for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy professionals_select_platform_admin on public.professionals for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy services_select_platform_admin on public.services for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy professional_services_select_platform_admin on public.professional_services for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy working_hours_select_platform_admin on public.working_hours for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy blocked_times_select_platform_admin on public.blocked_times for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy customers_select_platform_admin on public.customers for select to authenticated
using (private.is_platform_admin((select auth.uid())));
create policy appointments_select_platform_admin on public.appointments for select to authenticated
using (private.is_platform_admin((select auth.uid())));

-- Professionals may choose from the active service catalog of their own
-- business during first-login setup, without gaining customer access.
drop policy services_select_scoped on public.services;
create policy services_select_scoped on public.services for select to authenticated
using (
  private.is_platform_admin((select auth.uid()))
  or private.is_business_owner(business_id)
  or (active and private.is_business_member(business_id))
);

create or replace function public.configure_professional(
  p_professional_id uuid,
  p_services jsonb,
  p_working_hours jsonb,
  p_recurring_blocks jsonb,
  p_mark_complete boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select p.business_id, p.user_id into v_business_id, v_user_id
  from public.professionals p where p.id = p_professional_id;

  if v_business_id is null then
    raise exception 'professional_not_found' using errcode = 'P0002';
  end if;

  if not (
    private.is_platform_admin(auth.uid())
    or private.is_business_owner(v_business_id)
    or v_user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_services, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_working_hours, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_recurring_blocks, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_configuration' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_services, '[]'::jsonb))
      as x(service_id uuid, duration_override_minutes integer)
    left join public.services s on s.id = x.service_id and s.business_id = v_business_id and s.active
    where s.id is null
      or (x.duration_override_minutes is not null and x.duration_override_minutes not between 5 and 720)
  ) then
    raise exception 'invalid_service_configuration' using errcode = '23514';
  end if;

  update public.professional_services
  set active = false
  where professional_id = p_professional_id and business_id = v_business_id;

  insert into public.professional_services (
    business_id, professional_id, service_id, duration_override_minutes, active
  )
  select v_business_id, p_professional_id, x.service_id, x.duration_override_minutes, true
  from jsonb_to_recordset(coalesce(p_services, '[]'::jsonb))
    as x(service_id uuid, duration_override_minutes integer)
  on conflict (professional_id, service_id) do update
  set duration_override_minutes = excluded.duration_override_minutes, active = true;

  delete from public.working_hours
  where professional_id = p_professional_id and business_id = v_business_id;

  insert into public.working_hours (
    business_id, professional_id, weekday, start_time, end_time, active
  )
  select v_business_id, p_professional_id, x.weekday, x.start_time, x.end_time, true
  from jsonb_to_recordset(coalesce(p_working_hours, '[]'::jsonb))
    as x(weekday smallint, start_time time, end_time time);

  delete from public.recurring_blocks
  where professional_id = p_professional_id and business_id = v_business_id;

  insert into public.recurring_blocks (
    business_id, professional_id, weekday, start_time, end_time, reason, active
  )
  select v_business_id, p_professional_id, x.weekday, x.start_time, x.end_time,
    nullif(trim(x.reason), ''), true
  from jsonb_to_recordset(coalesce(p_recurring_blocks, '[]'::jsonb))
    as x(weekday smallint, start_time time, end_time time, reason text);

  update public.professionals
  set setup_completed_at = case
    when p_mark_complete then coalesce(setup_completed_at, now())
    else setup_completed_at
  end
  where id = p_professional_id;
end;
$$;

revoke all on function public.configure_professional(uuid, jsonb, jsonb, jsonb, boolean)
  from public, anon;
grant execute on function public.configure_professional(uuid, jsonb, jsonb, jsonb, boolean)
  to authenticated;

create or replace function public.admin_update_business(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_logo_url text,
  p_timezone text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.businesses set
    name = trim(p_name), phone = p_phone, logo_url = nullif(trim(p_logo_url), ''),
    timezone = p_timezone, active = p_active
  where id = p_business_id;
  if not found then raise exception 'business_not_found' using errcode = 'P0002'; end if;

  insert into public.admin_audit_logs (
    actor_user_id, business_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_business_id,
    case when p_active then 'BUSINESS_UPDATED_OR_ACTIVATED' else 'BUSINESS_UPDATED_OR_DEACTIVATED' end,
    'business', p_business_id,
    jsonb_build_object('name', trim(p_name), 'phone', p_phone, 'timezone', p_timezone, 'active', p_active)
  );
end;
$$;

create or replace function public.admin_update_professional(
  p_professional_id uuid,
  p_name text,
  p_photo_url text,
  p_bio text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_business_id uuid;
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.professionals set
    name = trim(p_name), photo_url = nullif(trim(p_photo_url), ''),
    bio = nullif(trim(p_bio), ''), active = p_active
  where id = p_professional_id returning business_id into v_business_id;
  if v_business_id is null then raise exception 'professional_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_logs (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_business_id, 'PROFESSIONAL_UPDATED', 'professional', p_professional_id,
    jsonb_build_object('name', trim(p_name), 'active', p_active));
end;
$$;

create or replace function public.admin_update_service(
  p_service_id uuid,
  p_name text,
  p_description text,
  p_price_cents integer,
  p_duration_minutes integer,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_business_id uuid;
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.services set
    name = trim(p_name), description = nullif(trim(p_description), ''),
    price_cents = p_price_cents, default_duration_minutes = p_duration_minutes,
    active = p_active
  where id = p_service_id returning business_id into v_business_id;
  if v_business_id is null then raise exception 'service_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_logs (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_business_id, 'SERVICE_UPDATED', 'service', p_service_id,
    jsonb_build_object('name', trim(p_name), 'price_cents', p_price_cents,
      'duration_minutes', p_duration_minutes, 'active', p_active));
end;
$$;

revoke all on function public.admin_update_business(uuid, text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_update_professional(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.admin_update_service(uuid, text, text, integer, integer, boolean) from public, anon;
grant execute on function public.admin_update_business(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_update_professional(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.admin_update_service(uuid, text, text, integer, integer, boolean) to authenticated;

-- Add recurring weekly blocks to the existing real availability engine.
create or replace function public.get_public_availability(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with booking_context as (
    select b.id as business_id, b.timezone,
      coalesce(ps.duration_override_minutes, s.default_duration_minutes) as duration_minutes
    from public.businesses b
    join public.professionals p on p.business_id = b.id and p.id = p_professional_id and p.active
    join public.services s on s.business_id = b.id and s.id = p_service_id and s.active
    join public.professional_services ps on ps.business_id = b.id
      and ps.professional_id = p.id and ps.service_id = s.id and ps.active
    where b.slug = lower(trim(p_slug)) and b.active
  ), candidates as (
    select generate_series(
      (p_date + wh.start_time) at time zone bc.timezone,
      ((p_date + wh.end_time) at time zone bc.timezone) - make_interval(mins => bc.duration_minutes),
      make_interval(mins => public.slot_granularity_minutes())
    ) as slot_start, bc.duration_minutes, bc.timezone
    from booking_context bc
    join public.working_hours wh on wh.business_id = bc.business_id
      and wh.professional_id = p_professional_id
      and wh.weekday = extract(dow from p_date)::smallint and wh.active
  )
  select distinct c.slot_start
  from candidates c
  where c.slot_start > now()
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = p_professional_id and a.status <> 'CANCELLED'
        and tstzrange(a.starts_at, a.ends_at, '[)') &&
          tstzrange(c.slot_start, c.slot_start + make_interval(mins => c.duration_minutes), '[)')
    )
    and not exists (
      select 1 from public.blocked_times bt
      where bt.professional_id = p_professional_id
        and tstzrange(bt.starts_at, bt.ends_at, '[)') &&
          tstzrange(c.slot_start, c.slot_start + make_interval(mins => c.duration_minutes), '[)')
    )
    and not exists (
      select 1 from public.recurring_blocks rb
      where rb.professional_id = p_professional_id and rb.active
        and rb.weekday = extract(dow from p_date)::smallint
        and tstzrange(
          (p_date + rb.start_time) at time zone c.timezone,
          (p_date + rb.end_time) at time zone c.timezone,
          '[)'
        ) && tstzrange(c.slot_start, c.slot_start + make_interval(mins => c.duration_minutes), '[)')
    )
  order by c.slot_start;
$$;

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
  v_business_id uuid; v_timezone text; v_duration integer;
  v_ends_at timestamptz; v_customer_id uuid; v_appointment_id uuid;
  v_local_date date;
begin
  select b.id, b.timezone, coalesce(ps.duration_override_minutes, s.default_duration_minutes)
  into v_business_id, v_timezone, v_duration
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
      and tstzrange(
        (v_local_date + rb.start_time) at time zone v_timezone,
        (v_local_date + rb.end_time) at time zone v_timezone,
        '[)'
      ) && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then raise exception 'recurring_block' using errcode = '23P01'; end if;

  insert into public.customers (business_id, name, phone)
  values (v_business_id, trim(p_customer_name), p_customer_phone)
  on conflict (business_id, phone) do update set name = excluded.name, updated_at = now()
  returning id into v_customer_id;

  insert into public.appointments (
    business_id, professional_id, service_id, customer_id,
    starts_at, ends_at, status, public_idempotency_key
  ) values (
    v_business_id, p_professional_id, p_service_id, v_customer_id,
    p_starts_at, v_ends_at, 'CONFIRMED', p_idempotency_key
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

-- Explicit grants: anon can execute only the three public RPCs and cannot
-- access tables directly. Authenticated receives only operations used by the app.
revoke all privileges on all tables in schema public from anon;
grant execute on function public.get_public_business(text) to anon;
grant execute on function public.get_public_availability(text, uuid, uuid, date) to anon;
grant execute on function public.book_public_appointment(text, uuid, uuid, timestamptz, text, text, uuid) to anon;

revoke all privileges on all tables in schema public from authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.businesses to authenticated;
grant select, insert, update on public.business_members to authenticated;
grant select, insert, update on public.professionals to authenticated;
grant select, insert, update on public.services to authenticated;
grant select, insert, update on public.professional_services to authenticated;
grant select, insert, update, delete on public.working_hours to authenticated;
grant select, insert, update, delete on public.recurring_blocks to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select on public.customers to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select on public.platform_admins to authenticated;
grant select on public.admin_audit_logs to authenticated;

commit;
