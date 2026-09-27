-- NEXO Book: operational completion, finance, commissions, waitlist and reminders.
-- All monetary values are integer cents. Percentage commission values use basis points
-- (4000 = 40.00%). A confirmed appointment whose ends_at is in the past is treated as
-- awaiting completion without mutating historical rows through a cron job.

alter type public.member_role add value if not exists 'RECEPTIONIST';

do $$ begin
  create type public.appointment_payment_status as enum ('UNPAID', 'PARTIAL', 'PAID');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_record_status as enum ('PAID', 'VOIDED', 'REFUNDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.commission_type as enum ('PERCENTAGE', 'FIXED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.commission_status as enum ('PENDING', 'PAID', 'VOIDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.waitlist_status as enum ('WAITING', 'CONTACTED', 'BOOKED', 'CANCELLED', 'EXPIRED');
exception when duplicate_object then null; end $$;

alter table public.businesses
  add column if not exists description text,
  add column if not exists address text,
  add column if not exists instagram_url text,
  add column if not exists professionals_can_view_commission boolean not null default false,
  add column if not exists commission_basis text not null default 'GROSS_SERVICE_VALUE',
  add column if not exists reminders_enabled boolean not null default false,
  add column if not exists reminder_24h_enabled boolean not null default true,
  add column if not exists reminder_2h_enabled boolean not null default false,
  add column if not exists reminder_template text,
  add column if not exists notification_provider text,
  add column if not exists cash_closing_enabled boolean not null default false;

alter table public.businesses drop constraint if exists businesses_commission_basis_check;
alter table public.businesses add constraint businesses_commission_basis_check
  check (commission_basis in ('GROSS_SERVICE_VALUE', 'NET_AFTER_DISCOUNT'));
alter table public.businesses drop constraint if exists businesses_description_check;
alter table public.businesses add constraint businesses_description_check
  check (description is null or char_length(description) <= 1500);
alter table public.businesses drop constraint if exists businesses_address_check;
alter table public.businesses add constraint businesses_address_check
  check (address is null or char_length(address) <= 500);
alter table public.businesses drop constraint if exists businesses_reminder_template_check;
alter table public.businesses add constraint businesses_reminder_template_check
  check (reminder_template is null or char_length(reminder_template) <= 500);

alter table public.services add column if not exists category text;
alter table public.professionals add column if not exists can_add_custom_charge boolean not null default false;

alter table public.appointments
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_user_id uuid references public.profiles(id),
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists realized_total_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists discount_reason text,
  add column if not exists payment_status public.appointment_payment_status not null default 'UNPAID';

alter table public.appointments drop constraint if exists appointments_realized_total_check;
alter table public.appointments add constraint appointments_realized_total_check
  check (realized_total_cents is null or realized_total_cents >= 0);
alter table public.appointments drop constraint if exists appointments_discount_check;
alter table public.appointments add constraint appointments_discount_check check (discount_cents >= 0);

create table if not exists public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  appointment_id uuid not null references public.appointments(id),
  service_id uuid references public.services(id),
  professional_id uuid not null references public.professionals(id),
  service_name_snapshot text not null check (char_length(trim(service_name_snapshot)) between 2 and 120),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot between 1 and 720),
  quantity integer not null default 1 check (quantity between 1 and 100),
  commission_type_snapshot public.commission_type,
  commission_value_snapshot integer check (commission_value_snapshot is null or commission_value_snapshot >= 0),
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  appointment_id uuid not null references public.appointments(id),
  amount_cents integer not null check (amount_cents > 0),
  method public.payment_method not null,
  status public.payment_record_status not null default 'PAID',
  paid_at timestamptz not null default now(),
  recorded_by_user_id uuid not null references public.profiles(id),
  notes text check (notes is null or char_length(notes) <= 500),
  voided_at timestamptz,
  voided_by_user_id uuid references public.profiles(id),
  void_reason text check (void_reason is null or char_length(trim(void_reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.professional_commission_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  professional_id uuid not null references public.professionals(id),
  service_id uuid references public.services(id),
  type public.commission_type not null,
  value integer not null check (value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists commission_rules_unique_service_idx
  on public.professional_commission_rules (professional_id, service_id)
  where service_id is not null;
create unique index if not exists commission_rules_unique_default_idx
  on public.professional_commission_rules (professional_id)
  where service_id is null;

create table if not exists public.commission_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  appointment_id uuid not null references public.appointments(id),
  appointment_item_id uuid not null references public.appointment_items(id),
  professional_id uuid not null references public.professionals(id),
  production_cents integer not null check (production_cents >= 0),
  commission_type_snapshot public.commission_type not null,
  commission_value_snapshot integer not null check (commission_value_snapshot >= 0),
  commission_cents integer not null check (commission_cents >= 0),
  status public.commission_status not null default 'PENDING',
  paid_at timestamptz,
  paid_by_user_id uuid references public.profiles(id),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  unique (appointment_item_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  description text not null check (char_length(trim(description)) between 2 and 160),
  category text not null check (category in ('MATERIAL', 'RENT', 'PRODUCTS', 'MARKETING', 'MAINTENANCE', 'SALARIES', 'OTHER')),
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null,
  method public.payment_method,
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'VOIDED')),
  recorded_by_user_id uuid not null references public.profiles(id),
  voided_at timestamptz,
  voided_by_user_id uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  actor_user_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  closing_date date not null,
  expected_cash_cents integer not null check (expected_cash_cents >= 0),
  counted_cash_cents integer not null check (counted_cash_cents >= 0),
  difference_cents integer not null,
  totals_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  closed_by_user_id uuid not null references public.profiles(id),
  closed_at timestamptz not null default now(),
  unique (business_id, closing_date)
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null references public.customers(id),
  service_id uuid not null references public.services(id),
  professional_id uuid references public.professionals(id),
  preferred_date date not null,
  period text not null default 'ANY' check (period in ('MORNING', 'AFTERNOON', 'EVENING', 'ANY', 'CUSTOM')),
  preferred_start_time time,
  preferred_end_time time,
  status public.waitlist_status not null default 'WAITING',
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by_user_id uuid not null references public.profiles(id),
  booked_appointment_id uuid references public.appointments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period <> 'CUSTOM' or (preferred_start_time is not null and preferred_end_time > preferred_start_time))
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  appointment_id uuid references public.appointments(id),
  customer_id uuid references public.customers(id),
  channel text not null default 'WHATSAPP' check (channel in ('WHATSAPP')),
  template_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'NOT_CONFIGURED')),
  provider text,
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, template_kind)
);

create table if not exists public.appointment_action_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  appointment_id uuid not null references public.appointments(id),
  token_hash text not null unique,
  allowed_action text not null check (allowed_action in ('CONFIRM', 'CANCEL')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appointments_business_status_ends_idx on public.appointments (business_id, status, ends_at);
create index if not exists appointments_professional_status_ends_idx on public.appointments (professional_id, status, ends_at);
create index if not exists appointments_completed_at_idx on public.appointments (business_id, completed_at desc) where status = 'COMPLETED';
create index if not exists appointment_items_appointment_idx on public.appointment_items (appointment_id);
create index if not exists appointment_items_business_created_idx on public.appointment_items (business_id, created_at desc);
create index if not exists appointment_items_service_idx on public.appointment_items (service_id, created_at desc);
create index if not exists payments_appointment_idx on public.payments (appointment_id);
create index if not exists payments_business_paid_idx on public.payments (business_id, paid_at desc) where status = 'PAID';
create index if not exists commission_rules_professional_idx on public.professional_commission_rules (professional_id, active);
create index if not exists commission_entries_business_created_idx on public.commission_entries (business_id, created_at desc);
create index if not exists commission_entries_professional_status_idx on public.commission_entries (professional_id, status, created_at desc);
create index if not exists expenses_business_date_idx on public.expenses (business_id, expense_date desc) where status = 'ACTIVE';
create index if not exists financial_audit_business_created_idx on public.financial_audit_logs (business_id, created_at desc);
create index if not exists waitlist_business_status_date_idx on public.waitlist_entries (business_id, status, preferred_date);
create index if not exists waitlist_customer_idx on public.waitlist_entries (customer_id);
create index if not exists notification_queue_due_idx on public.notification_queue (status, scheduled_for) where status = 'PENDING';
create index if not exists appointment_tokens_appointment_idx on public.appointment_action_tokens (appointment_id);
create index if not exists appointments_completed_by_idx on public.appointments (completed_by_user_id);

create trigger appointment_items_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger commission_rules_set_updated_at before update on public.professional_commission_rules
  for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger waitlist_set_updated_at before update on public.waitlist_entries
  for each row execute function public.set_updated_at();
create trigger notification_queue_set_updated_at before update on public.notification_queue
  for each row execute function public.set_updated_at();

create or replace function private.is_business_operator(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid()
      and bm.role::text in ('OWNER', 'RECEPTIONIST')
  );
$$;

create or replace function private.can_access_appointment(p_appointment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id
      and (
        private.is_platform_admin(auth.uid())
        or private.is_business_operator(a.business_id)
        or private.is_current_professional(a.professional_id, a.business_id)
      )
  );
$$;

grant execute on function private.is_business_operator(uuid) to authenticated;
grant execute on function private.can_access_appointment(uuid) to authenticated;

alter table public.appointment_items enable row level security;
alter table public.payments enable row level security;
alter table public.professional_commission_rules enable row level security;
alter table public.commission_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.financial_audit_logs enable row level security;
alter table public.cash_closings enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.notification_queue enable row level security;
alter table public.appointment_action_tokens enable row level security;

create policy appointment_items_select_scoped on public.appointment_items for select to authenticated
  using (private.can_access_appointment(appointment_id));
create policy payments_select_scoped on public.payments for select to authenticated
  using (private.can_access_appointment(appointment_id));
create policy commission_rules_select_scoped on public.professional_commission_rules for select to authenticated
  using (private.is_business_operator(business_id) or private.is_current_professional(professional_id, business_id));
create policy commission_rules_write_owner on public.professional_commission_rules for all to authenticated
  using (private.is_business_owner(business_id)) with check (private.is_business_owner(business_id));
create policy commission_entries_select_scoped on public.commission_entries for select to authenticated
  using (
    private.is_business_operator(business_id)
    or (
      private.is_current_professional(professional_id, business_id)
      and exists (select 1 from public.businesses b where b.id = business_id and b.professionals_can_view_commission)
    )
  );
create policy expenses_select_operator on public.expenses for select to authenticated
  using (private.is_business_operator(business_id));
create policy financial_audit_select_owner on public.financial_audit_logs for select to authenticated
  using (private.is_business_owner(business_id) or private.is_platform_admin(auth.uid()));
create policy cash_closings_select_operator on public.cash_closings for select to authenticated
  using (private.is_business_operator(business_id));
create policy waitlist_select_operator on public.waitlist_entries for select to authenticated
  using (private.is_business_operator(business_id));
create policy notification_queue_select_operator on public.notification_queue for select to authenticated
  using (private.is_business_operator(business_id));

grant select on public.appointment_items, public.payments, public.professional_commission_rules,
  public.commission_entries, public.expenses, public.financial_audit_logs, public.cash_closings,
  public.waitlist_entries, public.notification_queue to authenticated;
revoke all on public.appointment_action_tokens from anon, authenticated;

create or replace function public.complete_appointment(
  p_appointment_id uuid,
  p_service_ids uuid[],
  p_payments jsonb default '[]'::jsonb,
  p_discount_cents integer default 0,
  p_discount_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_role text;
  v_actor_professional_id uuid;
  v_service_id uuid;
  v_service record;
  v_rule record;
  v_item_id uuid;
  v_gross integer := 0;
  v_total integer;
  v_received integer := 0;
  v_commission integer := 0;
  v_commission_base integer;
  v_payment jsonb;
  v_amount integer;
  v_method public.payment_method;
  v_payment_status public.appointment_payment_status;
  v_item_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if coalesce(array_length(p_service_ids, 1), 0) = 0 then
    raise exception 'at_least_one_service_required' using errcode = '22023';
  end if;

  select * into v_appointment from public.appointments
  where id = p_appointment_id for update;
  if not found then raise exception 'appointment_not_found' using errcode = 'P0002'; end if;

  select bm.role::text into v_role from public.business_members bm
  where bm.business_id = v_appointment.business_id and bm.user_id = auth.uid();
  select p.id into v_actor_professional_id from public.professionals p
  where p.business_id = v_appointment.business_id and p.user_id = auth.uid() and p.active;

  if v_role not in ('OWNER', 'RECEPTIONIST', 'PROFESSIONAL') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_role = 'PROFESSIONAL' and v_actor_professional_id is distinct from v_appointment.professional_id then
    raise exception 'professional_not_assigned' using errcode = '42501';
  end if;
  if v_appointment.status <> 'CONFIRMED' then
    raise exception 'appointment_already_resolved' using errcode = '23505';
  end if;
  if v_appointment.ends_at > now() then
    raise exception 'appointment_not_finished' using errcode = '22007';
  end if;
  if p_discount_cents < 0 then raise exception 'invalid_discount' using errcode = '22023'; end if;
  if v_role = 'PROFESSIONAL' and p_discount_cents <> 0 then
    raise exception 'discount_not_allowed' using errcode = '42501';
  end if;
  if p_discount_cents > 0 and char_length(trim(coalesce(p_discount_reason, ''))) < 3 then
    raise exception 'discount_reason_required' using errcode = '22023';
  end if;

  foreach v_service_id in array p_service_ids loop
    select s.id, s.name,
      coalesce(ps.price_override_cents, s.price_cents) as price_cents,
      coalesce(ps.duration_override_minutes, s.default_duration_minutes) as duration_minutes
    into v_service
    from public.services s
    join public.professional_services ps on ps.business_id = s.business_id
      and ps.service_id = s.id and ps.professional_id = v_appointment.professional_id and ps.active
    where s.id = v_service_id and s.business_id = v_appointment.business_id and s.active;
    if not found then raise exception 'service_not_available' using errcode = 'P0002'; end if;
    v_gross := v_gross + v_service.price_cents;
  end loop;

  if p_discount_cents > v_gross then raise exception 'discount_exceeds_total' using errcode = '22023'; end if;
  v_total := v_gross - p_discount_cents;

  for v_payment in select value from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    v_amount := (v_payment->>'amount_cents')::integer;
    v_method := (v_payment->>'method')::public.payment_method;
    if v_amount <= 0 then raise exception 'invalid_payment_amount' using errcode = '22023'; end if;
    v_received := v_received + v_amount;
  end loop;
  if v_received > v_total then raise exception 'payment_exceeds_total' using errcode = '22023'; end if;

  foreach v_service_id in array p_service_ids loop
    select s.id, s.name,
      coalesce(ps.price_override_cents, s.price_cents) as price_cents,
      coalesce(ps.duration_override_minutes, s.default_duration_minutes) as duration_minutes
    into v_service
    from public.services s
    join public.professional_services ps on ps.business_id = s.business_id
      and ps.service_id = s.id and ps.professional_id = v_appointment.professional_id and ps.active
    where s.id = v_service_id and s.business_id = v_appointment.business_id and s.active;

    select r.type, r.value into v_rule
    from public.professional_commission_rules r
    where r.business_id = v_appointment.business_id
      and r.professional_id = v_appointment.professional_id and r.active
      and (r.service_id = v_service_id or r.service_id is null)
    order by r.service_id nulls last limit 1;

    insert into public.appointment_items (
      business_id, appointment_id, service_id, professional_id, service_name_snapshot,
      unit_price_cents, duration_minutes_snapshot, quantity, commission_type_snapshot,
      commission_value_snapshot, created_by_user_id
    ) values (
      v_appointment.business_id, v_appointment.id, v_service.id, v_appointment.professional_id,
      v_service.name, v_service.price_cents, v_service.duration_minutes, 1,
      v_rule.type, v_rule.value, auth.uid()
    ) returning id into v_item_id;

    if v_rule.type is not null then
      v_commission_base := v_service.price_cents;
      if (select b.commission_basis from public.businesses b where b.id = v_appointment.business_id) = 'NET_AFTER_DISCOUNT'
         and v_gross > 0 then
        v_commission_base := round(v_service.price_cents::numeric * v_total / v_gross)::integer;
      end if;
      if v_rule.type = 'PERCENTAGE' then
        v_amount := round(v_commission_base::numeric * v_rule.value / 10000)::integer;
      else
        v_amount := least(v_rule.value, v_commission_base);
      end if;
      insert into public.commission_entries (
        business_id, appointment_id, appointment_item_id, professional_id, production_cents,
        commission_type_snapshot, commission_value_snapshot, commission_cents
      ) values (
        v_appointment.business_id, v_appointment.id, v_item_id, v_appointment.professional_id,
        v_commission_base, v_rule.type, v_rule.value, v_amount
      );
      v_commission := v_commission + v_amount;
    end if;
  end loop;

  for v_payment in select value from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    insert into public.payments (
      business_id, appointment_id, amount_cents, method, paid_at, recorded_by_user_id, notes
    ) values (
      v_appointment.business_id, v_appointment.id, (v_payment->>'amount_cents')::integer,
      (v_payment->>'method')::public.payment_method,
      coalesce((v_payment->>'paid_at')::timestamptz, now()), auth.uid(),
      nullif(trim(v_payment->>'notes'), '')
    );
  end loop;

  v_payment_status := case when v_received = 0 then 'UNPAID'::public.appointment_payment_status
    when v_received < v_total then 'PARTIAL'::public.appointment_payment_status
    else 'PAID'::public.appointment_payment_status end;

  update public.appointments set
    status = 'COMPLETED', completed_at = now(), completed_by_user_id = auth.uid(),
    status_changed_at = now(), realized_total_cents = v_total,
    discount_cents = p_discount_cents, discount_reason = nullif(trim(p_discount_reason), ''),
    payment_status = v_payment_status, updated_at = now()
  where id = v_appointment.id;

  insert into public.financial_audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, reason
  ) values (
    v_appointment.business_id, auth.uid(), 'APPOINTMENT_COMPLETED', 'appointment', v_appointment.id,
    jsonb_build_object('status', v_appointment.status, 'scheduled_cents', v_appointment.price_cents_snapshot),
    jsonb_build_object('status', 'COMPLETED', 'gross_cents', v_gross, 'discount_cents', p_discount_cents,
      'realized_cents', v_total, 'received_cents', v_received, 'payment_status', v_payment_status,
      'commission_cents', v_commission), nullif(trim(p_discount_reason), '')
  );

  insert into public.notification_events (
    business_id, professional_id, kind, title, message, entity_type, entity_id, metadata
  ) values (
    v_appointment.business_id, v_appointment.professional_id, 'APPOINTMENT_COMPLETED',
    'Atendimento concluído', 'O atendimento foi confirmado e lançado no financeiro.',
    'appointment', v_appointment.id,
    jsonb_build_object('realized_cents', v_total, 'received_cents', v_received)
  );

  select count(*) into v_item_count from public.appointment_items where appointment_id = v_appointment.id;
  return jsonb_build_object('appointment_id', v_appointment.id, 'gross_cents', v_gross,
    'total_cents', v_total, 'received_cents', v_received, 'payment_status', v_payment_status,
    'commission_cents', v_commission, 'item_count', v_item_count);
end;
$$;

create or replace function public.resolve_unattended_appointment(
  p_appointment_id uuid,
  p_outcome text,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_appointment public.appointments%rowtype; v_role text; v_professional_id uuid;
begin
  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'appointment_not_found' using errcode='P0002'; end if;
  select bm.role::text into v_role from public.business_members bm
    where bm.business_id=v_appointment.business_id and bm.user_id=auth.uid();
  select p.id into v_professional_id from public.professionals p
    where p.business_id=v_appointment.business_id and p.user_id=auth.uid() and p.active;
  if v_role not in ('OWNER','RECEPTIONIST','PROFESSIONAL')
     or (v_role='PROFESSIONAL' and v_professional_id is distinct from v_appointment.professional_id)
  then raise exception 'forbidden' using errcode='42501'; end if;
  if v_appointment.status <> 'CONFIRMED' then raise exception 'appointment_already_resolved' using errcode='23505'; end if;
  if v_appointment.ends_at > now() then raise exception 'appointment_not_finished' using errcode='22007'; end if;
  if p_outcome not in ('NO_SHOW','CANCELLED') then raise exception 'invalid_outcome' using errcode='22023'; end if;
  update public.appointments set status=p_outcome::public.appointment_status,
    status_changed_at=now(), completed_by_user_id=auth.uid(),
    cancelled_at=case when p_outcome='CANCELLED' then now() else null end,
    cancellation_reason=case when p_outcome='CANCELLED' then nullif(trim(p_reason),'') else null end,
    realized_total_cents=0, payment_status='UNPAID', updated_at=now()
  where id=v_appointment.id;
  insert into public.financial_audit_logs(business_id,actor_user_id,action,entity_type,entity_id,before_data,after_data,reason)
    values(v_appointment.business_id,auth.uid(),'APPOINTMENT_'||p_outcome,'appointment',v_appointment.id,
      jsonb_build_object('status',v_appointment.status,'scheduled_cents',v_appointment.price_cents_snapshot),
      jsonb_build_object('status',p_outcome,'realized_cents',0,'received_cents',0),nullif(trim(p_reason),''));
end;
$$;

create or replace function public.record_expense(
  p_description text, p_category text, p_amount_cents integer, p_expense_date date,
  p_method public.payment_method default null, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid; v_id uuid;
begin
  select bm.business_id into v_business_id from public.business_members bm
    where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_description,''))) < 2 or p_amount_cents <= 0
     or p_category not in ('MATERIAL','RENT','PRODUCTS','MARKETING','MAINTENANCE','SALARIES','OTHER')
  then raise exception 'invalid_expense' using errcode='22023'; end if;
  insert into public.expenses(business_id,description,category,amount_cents,expense_date,method,notes,recorded_by_user_id)
    values(v_business_id,trim(p_description),p_category,p_amount_cents,p_expense_date,p_method,nullif(trim(p_notes),''),auth.uid())
    returning id into v_id;
  insert into public.financial_audit_logs(business_id,actor_user_id,action,entity_type,entity_id,after_data)
    values(v_business_id,auth.uid(),'EXPENSE_RECORDED','expense',v_id,
      jsonb_build_object('description',trim(p_description),'category',p_category,'amount_cents',p_amount_cents,'expense_date',p_expense_date));
  return v_id;
end;
$$;

create or replace function public.get_financial_summary(p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_business_id uuid;
begin
  select bm.business_id into v_business_id from public.business_members bm
    where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;
  return jsonb_build_object(
    'scheduled_cents', coalesce((select sum(coalesce(a.price_cents_snapshot,0)) from public.appointments a
      where a.business_id=v_business_id and a.starts_at>=p_start and a.starts_at<p_end and a.status<>'CANCELLED'),0),
    'realized_cents', coalesce((select sum(coalesce(a.realized_total_cents,0)) from public.appointments a
      where a.business_id=v_business_id and a.completed_at>=p_start and a.completed_at<p_end and a.status='COMPLETED'),0),
    'received_cents', coalesce((select sum(p.amount_cents) from public.payments p
      where p.business_id=v_business_id and p.paid_at>=p_start and p.paid_at<p_end and p.status='PAID'),0),
    'expenses_cents', coalesce((select sum(e.amount_cents) from public.expenses e
      where e.business_id=v_business_id and e.expense_date >= (p_start at time zone (select timezone from public.businesses where id=v_business_id))::date
        and e.expense_date < (p_end at time zone (select timezone from public.businesses where id=v_business_id))::date and e.status='ACTIVE'),0),
    'commission_cents', coalesce((select sum(c.commission_cents) from public.commission_entries c
      where c.business_id=v_business_id and c.created_at>=p_start and c.created_at<p_end and c.status<>'VOIDED'),0),
    'pending_appointments', (select count(*) from public.appointments a
      where a.business_id=v_business_id and a.status='CONFIRMED' and a.ends_at<=now() and a.ends_at>=p_start and a.ends_at<p_end),
    'by_method', coalesce((select jsonb_object_agg(method,total) from (
      select p.method::text method,sum(p.amount_cents) total from public.payments p
      where p.business_id=v_business_id and p.paid_at>=p_start and p.paid_at<p_end and p.status='PAID'
      group by p.method) x),'{}'::jsonb)
  );
end;
$$;

revoke all on function public.complete_appointment(uuid,uuid[],jsonb,integer,text) from public, anon;
revoke all on function public.resolve_unattended_appointment(uuid,text,text) from public, anon;
revoke all on function public.record_expense(text,text,integer,date,public.payment_method,text) from public, anon;
revoke all on function public.get_financial_summary(timestamptz,timestamptz) from public, anon;
grant execute on function public.complete_appointment(uuid,uuid[],jsonb,integer,text) to authenticated;
grant execute on function public.resolve_unattended_appointment(uuid,text,text) to authenticated;
grant execute on function public.record_expense(text,text,integer,date,public.payment_method,text) to authenticated;
grant execute on function public.get_financial_summary(timestamptz,timestamptz) to authenticated;

-- Receptionists can read all operational records and create/reschedule appointments through RPCs.
drop policy if exists customers_select_scoped on public.customers;
create policy customers_select_scoped on public.customers for select to authenticated using (
  private.is_platform_admin(auth.uid()) or private.is_business_operator(business_id)
  or exists (select 1 from public.appointments a where a.customer_id=customers.id
    and private.is_current_professional(a.professional_id,a.business_id))
);
drop policy if exists appointments_select_scoped on public.appointments;
create policy appointments_select_scoped on public.appointments for select to authenticated using (
  private.is_platform_admin(auth.uid()) or private.is_business_operator(business_id)
  or private.is_current_professional(professional_id,business_id)
);

-- Keep financial history append-only to API roles. Mutations occur only through audited RPCs.
revoke insert, update, delete on public.appointment_items, public.payments, public.commission_entries,
  public.expenses, public.financial_audit_logs, public.cash_closings from authenticated, anon;

