begin;

create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create type public.member_role as enum ('OWNER', 'PROFESSIONAL');
create type public.appointment_status as enum ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

create or replace function public.slot_granularity_minutes()
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$ select 15 $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(trim(full_name)) between 2 and 120),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 63
    and slug not in ('login', 'cadastro', 'painel', 'onboarding', 'api', 'admin', 'auth', 'settings')
  ),
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  logo_url text,
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) between 3 and 64),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 120),
  photo_url text,
  bio text check (bio is null or char_length(bio) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, user_id),
  foreign key (business_id, user_id)
    references public.business_members(business_id, user_id)
    on delete restrict
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  price_cents integer not null check (price_cents >= 0),
  default_duration_minutes integer not null check (default_duration_minutes between 5 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.professional_services (
  business_id uuid not null references public.businesses(id) on delete restrict,
  professional_id uuid not null,
  service_id uuid not null,
  duration_override_minutes integer check (duration_override_minutes is null or duration_override_minutes between 5 and 720),
  price_override_cents integer check (price_override_cents is null or price_override_cents >= 0),
  active boolean not null default true,
  primary key (professional_id, service_id),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete restrict,
  foreign key (service_id, business_id)
    references public.services(id, business_id) on delete restrict
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  check (start_time < end_time),
  check (
    extract(minute from start_time)::integer % public.slot_granularity_minutes() = 0
    and extract(second from start_time) = 0
    and extract(minute from end_time)::integer % public.slot_granularity_minutes() = 0
    and extract(second from end_time) = 0
  ),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete restrict
);

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  professional_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete restrict
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, phone)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  professional_id uuid not null,
  service_id uuid not null,
  customer_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'CONFIRMED',
  notes text check (notes is null or char_length(notes) <= 2000),
  public_idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique (id, business_id),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete restrict,
  foreign key (service_id, business_id)
    references public.services(id, business_id) on delete restrict,
  foreign key (customer_id, business_id)
    references public.customers(id, business_id) on delete restrict,
  constraint appointments_no_active_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'CANCELLED')
);

create unique index appointments_public_idempotency_uidx
  on public.appointments (business_id, public_idempotency_key)
  where public_idempotency_key is not null;

create index business_members_user_idx on public.business_members(user_id);
create index business_members_business_idx on public.business_members(business_id);
create index professionals_business_idx on public.professionals(business_id);
create index services_business_active_idx on public.services(business_id, active);
create index professional_services_service_idx on public.professional_services(service_id, active);
create index working_hours_professional_weekday_idx on public.working_hours(professional_id, weekday) where active;
create index blocked_times_professional_starts_idx on public.blocked_times(professional_id, starts_at);
create index customers_business_idx on public.customers(business_id);
create index appointments_business_starts_idx on public.appointments(business_id, starts_at);
create index appointments_professional_starts_idx on public.appointments(professional_id, starts_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger professionals_set_updated_at before update on public.professionals
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role = 'OWNER'
  );
$$;

create or replace function public.is_current_professional(p_professional_id uuid, p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.professionals p
    where p.id = p_professional_id
      and p.business_id = p_business_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.is_business_owner(uuid) from public;
revoke all on function public.is_current_professional(uuid, uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.is_current_professional(uuid, uuid) to authenticated;

create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_phone text,
  p_timezone text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.business_members where user_id = v_user_id) then
    raise exception 'user_already_has_business' using errcode = '23505';
  end if;

  insert into public.businesses (name, slug, phone, timezone)
  values (trim(p_name), lower(trim(p_slug)), p_phone, p_timezone)
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, 'OWNER');

  return v_business_id;
end;
$$;

revoke all on function public.create_business_with_owner(text, text, text, text) from public;
grant execute on function public.create_business_with_owner(text, text, text, text) to authenticated;

create or replace function public.get_public_business(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'phone', b.phone,
    'logo_url', b.logo_url,
    'timezone', b.timezone,
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'photo_url', p.photo_url, 'bio', p.bio,
        'service_ids', coalesce((
          select jsonb_agg(ps.service_id)
          from public.professional_services ps
          join public.services s on s.id = ps.service_id and s.business_id = ps.business_id
          where ps.professional_id = p.id and ps.active and s.active
        ), '[]'::jsonb)
      ) order by p.name)
      from public.professionals p
      where p.business_id = b.id and p.active
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'price_cents', s.price_cents,
        'default_duration_minutes', s.default_duration_minutes
      ) order by s.name)
      from public.services s
      where s.business_id = b.id and s.active
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = lower(trim(p_slug)) and b.active;
$$;

revoke all on function public.get_public_business(text) from public;
grant execute on function public.get_public_business(text) to anon, authenticated;

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
    select
      b.id as business_id,
      b.timezone,
      coalesce(ps.duration_override_minutes, s.default_duration_minutes) as duration_minutes
    from public.businesses b
    join public.professionals p on p.business_id = b.id and p.id = p_professional_id and p.active
    join public.services s on s.business_id = b.id and s.id = p_service_id and s.active
    join public.professional_services ps on ps.business_id = b.id
      and ps.professional_id = p.id and ps.service_id = s.id and ps.active
    where b.slug = lower(trim(p_slug)) and b.active
  ),
  candidates as (
    select
      generate_series(
        (p_date + wh.start_time) at time zone bc.timezone,
        ((p_date + wh.end_time) at time zone bc.timezone) - make_interval(mins => bc.duration_minutes),
        make_interval(mins => public.slot_granularity_minutes())
      ) as slot_start,
      bc.duration_minutes
    from booking_context bc
    join public.working_hours wh on wh.business_id = bc.business_id
      and wh.professional_id = p_professional_id
      and wh.weekday = extract(dow from p_date)::smallint
      and wh.active
  )
  select distinct c.slot_start
  from candidates c
  where c.slot_start > now()
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = p_professional_id
        and a.status <> 'CANCELLED'
        and tstzrange(a.starts_at, a.ends_at, '[)') &&
          tstzrange(c.slot_start, c.slot_start + make_interval(mins => c.duration_minutes), '[)')
    )
    and not exists (
      select 1 from public.blocked_times bt
      where bt.professional_id = p_professional_id
        and tstzrange(bt.starts_at, bt.ends_at, '[)') &&
          tstzrange(c.slot_start, c.slot_start + make_interval(mins => c.duration_minutes), '[)')
    )
  order by c.slot_start;
$$;

revoke all on function public.get_public_availability(text, uuid, uuid, date) from public;
grant execute on function public.get_public_availability(text, uuid, uuid, date) to anon, authenticated;

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
  v_business_id uuid;
  v_timezone text;
  v_duration integer;
  v_ends_at timestamptz;
  v_customer_id uuid;
  v_appointment_id uuid;
begin
  select b.id, b.timezone, coalesce(ps.duration_override_minutes, s.default_duration_minutes)
  into v_business_id, v_timezone, v_duration
  from public.businesses b
  join public.professionals p on p.business_id = b.id and p.id = p_professional_id and p.active
  join public.services s on s.business_id = b.id and s.id = p_service_id and s.active
  join public.professional_services ps on ps.business_id = b.id
    and ps.professional_id = p.id and ps.service_id = s.id and ps.active
  where b.slug = lower(trim(p_slug)) and b.active;

  if v_business_id is null then
    raise exception 'booking_resource_not_found' using errcode = 'P0002';
  end if;
  if p_starts_at <= now() then
    raise exception 'appointment_must_be_in_future' using errcode = '22007';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  if not exists (
    select 1 from public.working_hours wh
    where wh.business_id = v_business_id
      and wh.professional_id = p_professional_id
      and wh.active
      and wh.weekday = extract(dow from (p_starts_at at time zone v_timezone)::date)::smallint
      and (p_starts_at at time zone v_timezone)::date = (v_ends_at at time zone v_timezone)::date
      and (p_starts_at at time zone v_timezone)::time >= wh.start_time
      and (v_ends_at at time zone v_timezone)::time <= wh.end_time
  ) then
    raise exception 'outside_working_hours' using errcode = '22007';
  end if;

  if extract(minute from (p_starts_at at time zone v_timezone))::integer % public.slot_granularity_minutes() <> 0
    or extract(second from (p_starts_at at time zone v_timezone)) <> 0 then
    raise exception 'invalid_slot_granularity' using errcode = '22007';
  end if;

  if exists (
    select 1 from public.blocked_times bt
    where bt.business_id = v_business_id
      and bt.professional_id = p_professional_id
      and tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'blocked_time' using errcode = '23P01';
  end if;

  insert into public.customers (business_id, name, phone)
  values (v_business_id, trim(p_customer_name), p_customer_phone)
  on conflict (business_id, phone) do update
    set name = excluded.name, updated_at = now()
  returning id into v_customer_id;

  insert into public.appointments (
    business_id, professional_id, service_id, customer_id,
    starts_at, ends_at, status, public_idempotency_key
  ) values (
    v_business_id, p_professional_id, p_service_id, v_customer_id,
    p_starts_at, v_ends_at, 'CONFIRMED', p_idempotency_key
  )
  on conflict (business_id, public_idempotency_key)
    where public_idempotency_key is not null
    do nothing
  returning id into v_appointment_id;

  if v_appointment_id is null then
    select a.id into v_appointment_id
    from public.appointments a
    where a.business_id = v_business_id and a.public_idempotency_key = p_idempotency_key;
  end if;

  return v_appointment_id;
end;
$$;

revoke all on function public.book_public_appointment(text, uuid, uuid, timestamptz, text, text, uuid) from public;
grant execute on function public.book_public_appointment(text, uuid, uuid, timestamptz, text, text, uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.professional_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated
using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy businesses_select_member on public.businesses for select to authenticated
using (public.is_business_member(id));
create policy businesses_update_owner on public.businesses for update to authenticated
using (public.is_business_owner(id)) with check (public.is_business_owner(id));

create policy members_select_self_or_owner on public.business_members for select to authenticated
using (user_id = auth.uid() or public.is_business_owner(business_id));
create policy members_insert_owner on public.business_members for insert to authenticated
with check (public.is_business_owner(business_id));
create policy members_update_owner on public.business_members for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy professionals_select_scoped on public.professionals for select to authenticated
using (public.is_business_owner(business_id) or user_id = auth.uid());
create policy professionals_insert_owner on public.professionals for insert to authenticated
with check (public.is_business_owner(business_id));
create policy professionals_update_owner on public.professionals for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy services_select_scoped on public.services for select to authenticated
using (
  public.is_business_owner(business_id)
  or exists (
    select 1 from public.professional_services ps
    where ps.service_id = services.id
      and ps.business_id = services.business_id
      and ps.active
      and public.is_current_professional(ps.professional_id, ps.business_id)
  )
);
create policy services_insert_owner on public.services for insert to authenticated
with check (public.is_business_owner(business_id));
create policy services_update_owner on public.services for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy professional_services_select_scoped on public.professional_services for select to authenticated
using (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id));
create policy professional_services_insert_owner on public.professional_services for insert to authenticated
with check (public.is_business_owner(business_id));
create policy professional_services_update_owner on public.professional_services for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy working_hours_select_scoped on public.working_hours for select to authenticated
using (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id));
create policy working_hours_insert_owner on public.working_hours for insert to authenticated
with check (public.is_business_owner(business_id));
create policy working_hours_update_owner on public.working_hours for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy working_hours_delete_owner on public.working_hours for delete to authenticated
using (public.is_business_owner(business_id));

create policy blocked_times_select_scoped on public.blocked_times for select to authenticated
using (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id));
create policy blocked_times_insert_scoped on public.blocked_times for insert to authenticated
with check (
  created_by = auth.uid()
  and (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id))
);
create policy blocked_times_update_scoped on public.blocked_times for update to authenticated
using (public.is_business_owner(business_id) or (created_by = auth.uid() and public.is_current_professional(professional_id, business_id)))
with check (public.is_business_owner(business_id) or (created_by = auth.uid() and public.is_current_professional(professional_id, business_id)));
create policy blocked_times_delete_scoped on public.blocked_times for delete to authenticated
using (public.is_business_owner(business_id) or (created_by = auth.uid() and public.is_current_professional(professional_id, business_id)));

create policy customers_select_scoped on public.customers for select to authenticated
using (
  public.is_business_owner(business_id)
  or exists (
    select 1 from public.appointments a
    where a.customer_id = customers.id
      and a.business_id = customers.business_id
      and public.is_current_professional(a.professional_id, a.business_id)
  )
);

create policy appointments_select_scoped on public.appointments for select to authenticated
using (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id));
create policy appointments_insert_owner on public.appointments for insert to authenticated
with check (public.is_business_owner(business_id));
create policy appointments_update_owner on public.appointments for update to authenticated
using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

commit;
