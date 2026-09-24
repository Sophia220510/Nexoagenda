begin;

alter table public.businesses
  add column business_type text not null default 'OTHER'
  check (business_type in ('BARBERSHOP','SALON','AESTHETICS','CLINIC','OFFICE','TATTOO','MANICURE','PERSONAL_TRAINER','PET_SERVICE','MASSAGE','STUDIO','CONSULTING','OTHER'));

create table public.login_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  internal_auth_identifier text not null unique,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint login_identities_username_format check (
    username_normalized = lower(username_normalized)
    and username_normalized ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
    and username = username_normalized
  )
);

create index login_identities_active_idx on public.login_identities(active) where active;
create trigger login_identities_set_updated_at before update on public.login_identities
for each row execute function public.set_updated_at();

alter table public.login_identities enable row level security;
create policy login_identities_select_self_or_admin on public.login_identities
for select to authenticated using (
  user_id = (select auth.uid()) or private.is_platform_admin((select auth.uid()))
);

revoke all on public.login_identities from public, anon;
grant select on public.login_identities to authenticated;

create or replace function public.complete_password_change()
returns void language sql security definer set search_path = '' as $$
  update public.login_identities
  set must_change_password = false
  where user_id = auth.uid();
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

commit;
