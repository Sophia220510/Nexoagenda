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

update public.notification_events
set
  title = replace(replace(replace(replace(replace(replace(replace(
    title,
    'ServiÃ§o', 'Serviço'),
    'HorÃ¡rio', 'Horário'),
    'ConfiguraÃ§Ãµes', 'Configurações'),
    'concluÃ­do', 'concluído'),
    'nÃ£o', 'não'),
    'Ã ', 'à'),
    'â€”', '—'),
  message = replace(replace(replace(replace(replace(replace(replace(
    message,
    'ServiÃ§o', 'Serviço'),
    'HorÃ¡rio', 'Horário'),
    'ConfiguraÃ§Ãµes', 'Configurações'),
    'concluÃ­do', 'concluído'),
    'nÃ£o', 'não'),
    'Ã ', 'à'),
    'â€”', '—')
where title like '%Ã%'
   or title like '%â%'
   or message like '%Ã%'
   or message like '%â%';
