alter table public.businesses
  add column if not exists operation_profile text not null default 'ESSENTIAL_TEAM',
  add column if not exists feature_flags jsonb not null default '{
    "team_management": true,
    "reception": true,
    "commissions": true,
    "waitlist": false,
    "cash_closing": false,
    "advanced_reports": false,
    "whatsapp_reminders": true
  }'::jsonb;

alter table public.businesses
  drop constraint if exists businesses_operation_profile_check;

alter table public.businesses
  add constraint businesses_operation_profile_check
  check (operation_profile in (
    'SOLO',
    'ESSENTIAL_TEAM',
    'GROWING_OPERATION',
    'STRUCTURED_OPERATION'
  ));

alter table public.businesses
  drop constraint if exists businesses_feature_flags_object_check;

alter table public.businesses
  add constraint businesses_feature_flags_object_check
  check (jsonb_typeof(feature_flags) = 'object');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'business-assets',
  'business-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.businesses.operation_profile is
  'Administrative operating model used to select a sensible initial feature set.';
comment on column public.businesses.feature_flags is
  'Per-business capabilities managed by the platform administrator.';
