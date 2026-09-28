begin;

update public.businesses
set feature_flags =
  (feature_flags - 'whatsapp_reminders') ||
  jsonb_build_object(
    'site_notifications',
    coalesce(
      (feature_flags ->> 'site_notifications')::boolean,
      (feature_flags ->> 'whatsapp_reminders')::boolean,
      true
    )
  )
where feature_flags ? 'whatsapp_reminders'
   or not feature_flags ? 'site_notifications';

alter table public.businesses
  alter column feature_flags set default '{
    "team_management": true,
    "reception": true,
    "commissions": true,
    "waitlist": false,
    "cash_closing": false,
    "advanced_reports": false,
    "site_notifications": true
  }'::jsonb;

create or replace function public.get_unread_notification_count(
  p_business_id uuid default null,
  p_professional_id uuid default null
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)
  from public.notification_events ne
  where (p_business_id is null or ne.business_id = p_business_id)
    and (p_professional_id is null or ne.professional_id = p_professional_id)
    and not exists (
      select 1
      from public.notification_reads nr
      where nr.notification_id = ne.id
        and nr.user_id = auth.uid()
    );
$$;

revoke all on function public.get_unread_notification_count(uuid, uuid) from public, anon;
grant execute on function public.get_unread_notification_count(uuid, uuid) to authenticated;

create or replace function public.admin_list_business_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      b.id,
      b.name,
      b.slug,
      b.phone,
      b.logo_url,
      b.business_type,
      b.active,
      b.created_at,
      (select count(*) from public.professionals p where p.business_id = b.id) as professional_count,
      (select count(*) from public.customers c where c.business_id = b.id) as customer_count,
      (select count(*) from public.appointments a where a.business_id = b.id) as appointment_count
    from public.businesses b
  ) item;

  return v_result;
end;
$$;

revoke all on function public.admin_list_business_overview() from public, anon;
grant execute on function public.admin_list_business_overview() to authenticated;

create or replace function public.admin_dashboard_summary(
  p_today_start timestamptz,
  p_tomorrow_start timestamptz,
  p_month_ago timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'business_count', (select count(*) from public.businesses),
    'active_business_count', (select count(*) from public.businesses where active),
    'user_count', (select count(*) from public.login_identities),
    'professional_count', (select count(*) from public.professionals),
    'customer_count', (select count(*) from public.customers),
    'appointment_count', (select count(*) from public.appointments),
    'today_appointment_count', (
      select count(*) from public.appointments
      where starts_at >= p_today_start and starts_at < p_tomorrow_start
    ),
    'new_business_count', (
      select count(*) from public.businesses where created_at >= p_month_ago
    ),
    'recent_businesses', coalesce((
      select jsonb_agg(to_jsonb(recent_business) order by recent_business.created_at desc)
      from (
        select id, name, slug, active, created_at
        from public.businesses
        order by created_at desc
        limit 6
      ) recent_business
    ), '[]'::jsonb),
    'recent_appointments', coalesce((
      select jsonb_agg(to_jsonb(recent_appointment) order by recent_appointment.created_at desc)
      from (
        select
          a.id,
          a.starts_at,
          a.status,
          a.created_at,
          b.name as business_name,
          b.timezone as business_timezone,
          c.name as customer_name,
          p.name as professional_name
        from public.appointments a
        join public.businesses b on b.id = a.business_id
        join public.customers c on c.id = a.customer_id
        join public.professionals p on p.id = a.professional_id
        order by a.created_at desc
        limit 6
      ) recent_appointment
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_summary(timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_summary(timestamptz, timestamptz, timestamptz) to authenticated;

commit;
