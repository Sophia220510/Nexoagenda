begin;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid,
  kind text not null check (kind in (
    'APPOINTMENT_CREATED', 'APPOINTMENT_STATUS',
    'BLOCK_CREATED', 'BLOCK_REMOVED',
    'BUSINESS_UPDATED', 'PROFESSIONAL_CREATED', 'PROFESSIONAL_UPDATED',
    'SERVICE_CREATED', 'SERVICE_UPDATED'
  )),
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 2 and 500),
  entity_type text not null check (char_length(entity_type) between 2 and 60),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (professional_id, business_id)
    references public.professionals(id, business_id) on delete cascade
);

create table public.notification_reads (
  notification_id uuid not null references public.notification_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index notification_events_created_idx on public.notification_events(created_at desc);
create index notification_events_business_created_idx on public.notification_events(business_id, created_at desc);
create index notification_events_professional_created_idx on public.notification_events(professional_id, created_at desc)
  where professional_id is not null;
create index notification_reads_user_idx on public.notification_reads(user_id, read_at desc);

alter table public.notification_events enable row level security;
alter table public.notification_reads enable row level security;

create policy notification_events_select_scoped on public.notification_events
for select to authenticated
using (
  private.is_platform_admin((select auth.uid()))
  or private.is_business_owner(business_id)
  or (
    professional_id is not null
    and private.is_current_professional(professional_id, business_id)
  )
);

create policy notification_reads_select_self on public.notification_reads
for select to authenticated
using (user_id = (select auth.uid()));

create policy notification_reads_insert_self on public.notification_reads
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.notification_events ne
    where ne.id = notification_id
  )
);

create policy notification_reads_delete_self on public.notification_reads
for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function private.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer text;
  v_service text;
  v_professional text;
  v_timezone text;
  v_status text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select c.name, s.name, p.name, b.timezone
  into v_customer, v_service, v_professional, v_timezone
  from public.customers c, public.services s, public.professionals p, public.businesses b
  where c.id = new.customer_id and s.id = new.service_id
    and p.id = new.professional_id and b.id = new.business_id;

  if tg_op = 'INSERT' then
    insert into public.notification_events (
      business_id, professional_id, kind, title, message, entity_type, entity_id, metadata
    ) values (
      new.business_id, new.professional_id, 'APPOINTMENT_CREATED', 'Novo agendamento',
      format('%s agendou %s com %s para %s.', v_customer, v_service, v_professional,
        to_char(new.starts_at at time zone v_timezone, 'DD/MM/YYYY "às" HH24:MI')),
      'appointment', new.id,
      jsonb_build_object('status', new.status, 'starts_at', new.starts_at)
    );
  else
    v_status := case new.status
      when 'CONFIRMED' then 'confirmado'
      when 'CANCELLED' then 'cancelado'
      when 'COMPLETED' then 'concluído'
      when 'NO_SHOW' then 'marcado como não compareceu'
      else lower(new.status::text)
    end;
    insert into public.notification_events (
      business_id, professional_id, kind, title, message, entity_type, entity_id, metadata
    ) values (
      new.business_id, new.professional_id, 'APPOINTMENT_STATUS', 'Agendamento atualizado',
      format('O atendimento de %s com %s foi %s.', v_customer, v_professional, v_status),
      'appointment', new.id,
      jsonb_build_object('old_status', old.status, 'status', new.status, 'starts_at', new.starts_at)
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_block_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.blocked_times;
  v_professional text;
  v_timezone text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  select p.name, b.timezone into v_professional, v_timezone
  from public.professionals p
  join public.businesses b on b.id = p.business_id
  where p.id = v_row.professional_id;

  insert into public.notification_events (
    business_id, professional_id, kind, title, message, entity_type, entity_id, metadata
  ) values (
    v_row.business_id, v_row.professional_id,
    case when tg_op = 'DELETE' then 'BLOCK_REMOVED' else 'BLOCK_CREATED' end,
    case when tg_op = 'DELETE' then 'Bloqueio removido' else 'Horário bloqueado' end,
    format('%s: %s, de %s até %s%s.', v_professional,
      to_char(v_row.starts_at at time zone v_timezone, 'DD/MM/YYYY'),
      to_char(v_row.starts_at at time zone v_timezone, 'HH24:MI'),
      to_char(v_row.ends_at at time zone v_timezone, 'HH24:MI'),
      case when coalesce(v_row.reason, '') = '' then '' else ' — ' || v_row.reason end),
    'blocked_time', v_row.id,
    jsonb_build_object('starts_at', v_row.starts_at, 'ends_at', v_row.ends_at)
  );
  return v_row;
end;
$$;

create or replace function private.notify_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name
    or new.phone is distinct from old.phone
    or new.logo_url is distinct from old.logo_url
    or new.timezone is distinct from old.timezone
    or new.active is distinct from old.active
    or new.business_type is distinct from old.business_type then
    insert into public.notification_events (
      business_id, kind, title, message, entity_type, entity_id, metadata
    ) values (
      new.id, 'BUSINESS_UPDATED', 'Empresa atualizada',
      format('As configurações de %s foram atualizadas.', new.name),
      'business', new.id, jsonb_build_object('active', new.active, 'business_type', new.business_type)
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_professional_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notification_events (business_id, professional_id, kind, title, message, entity_type, entity_id, metadata)
    values (new.business_id, new.id, 'PROFESSIONAL_CREATED', 'Novo profissional',
      format('%s foi adicionado à equipe.', new.name), 'professional', new.id,
      jsonb_build_object('active', new.active));
  elsif new.name is distinct from old.name or new.active is distinct from old.active
    or new.setup_completed_at is distinct from old.setup_completed_at then
    insert into public.notification_events (business_id, professional_id, kind, title, message, entity_type, entity_id, metadata)
    values (new.business_id, new.id, 'PROFESSIONAL_UPDATED', 'Profissional atualizado',
      format('O perfil de %s foi atualizado.', new.name), 'professional', new.id,
      jsonb_build_object('active', new.active));
  end if;
  return new;
end;
$$;

create or replace function private.notify_service_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notification_events (business_id, kind, title, message, entity_type, entity_id, metadata)
    values (new.business_id, 'SERVICE_CREATED', 'Novo serviço',
      format('O serviço %s foi criado.', new.name), 'service', new.id,
      jsonb_build_object('active', new.active));
  elsif new.name is distinct from old.name or new.active is distinct from old.active
    or new.price_cents is distinct from old.price_cents
    or new.default_duration_minutes is distinct from old.default_duration_minutes then
    insert into public.notification_events (business_id, kind, title, message, entity_type, entity_id, metadata)
    values (new.business_id, 'SERVICE_UPDATED', 'Serviço atualizado',
      format('O serviço %s foi atualizado.', new.name), 'service', new.id,
      jsonb_build_object('active', new.active));
  end if;
  return new;
end;
$$;

revoke all on function private.notify_appointment_change() from public, anon, authenticated;
revoke all on function private.notify_block_change() from public, anon, authenticated;
revoke all on function private.notify_business_change() from public, anon, authenticated;
revoke all on function private.notify_professional_change() from public, anon, authenticated;
revoke all on function private.notify_service_change() from public, anon, authenticated;

create trigger appointments_notify_change
after insert or update of status on public.appointments
for each row execute function private.notify_appointment_change();

create trigger blocked_times_notify_change
after insert or delete on public.blocked_times
for each row execute function private.notify_block_change();

create trigger businesses_notify_change
after update on public.businesses
for each row execute function private.notify_business_change();

create trigger professionals_notify_change
after insert or update on public.professionals
for each row execute function private.notify_professional_change();

create trigger services_notify_change
after insert or update on public.services
for each row execute function private.notify_service_change();

grant select on public.notification_events to authenticated;
grant select, insert, delete on public.notification_reads to authenticated;

insert into public.notification_events (
  business_id, professional_id, kind, title, message, entity_type, entity_id, metadata, created_at
)
select a.business_id, a.professional_id, 'APPOINTMENT_CREATED', 'Agendamento',
  format('%s — %s com %s em %s.', c.name, s.name, p.name,
    to_char(a.starts_at at time zone b.timezone, 'DD/MM/YYYY "às" HH24:MI')),
  'appointment', a.id,
  jsonb_build_object('status', a.status, 'starts_at', a.starts_at), a.created_at
from public.appointments a
join public.customers c on c.id = a.customer_id
join public.services s on s.id = a.service_id
join public.professionals p on p.id = a.professional_id
join public.businesses b on b.id = a.business_id
where a.created_at >= now() - interval '90 days';

commit;
