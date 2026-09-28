-- Agenda 2.0, solo/team operation and explicit financial ownership.
-- Incremental only: existing businesses remain TEAM and all existing data is preserved.

do $$ begin
  create type public.business_mode as enum ('SOLO', 'TEAM');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.professional_financial_model as enum (
    'PROFESSIONAL_KEEPS_ALL', 'BUSINESS_KEEPS_ALL',
    'PERCENTAGE_COMMISSION', 'FIXED_COMMISSION'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_receiver as enum ('BUSINESS', 'PROFESSIONAL');
exception when duplicate_object then null; end $$;

alter table public.businesses
  add column if not exists business_mode public.business_mode not null default 'TEAM',
  add column if not exists slot_interval_minutes integer not null default 15,
  add column if not exists accepted_payment_methods public.payment_method[] not null
    default array['PIX','CASH','DEBIT_CARD','CREDIT_CARD','OTHER']::public.payment_method[],
  add column if not exists payment_fee_bps jsonb not null default
    '{"PIX":0,"CASH":0,"DEBIT_CARD":0,"CREDIT_CARD":0,"OTHER":0}'::jsonb;

alter table public.businesses drop constraint if exists businesses_slot_interval_check;
alter table public.businesses add constraint businesses_slot_interval_check
  check (slot_interval_minutes in (5, 10, 15, 20, 30, 60));
alter table public.businesses drop constraint if exists businesses_payment_fee_bps_check;
alter table public.businesses add constraint businesses_payment_fee_bps_check check (
  jsonb_typeof(payment_fee_bps) = 'object'
  and coalesce((payment_fee_bps->>'PIX')::integer,0) between 0 and 10000
  and coalesce((payment_fee_bps->>'CASH')::integer,0) between 0 and 10000
  and coalesce((payment_fee_bps->>'DEBIT_CARD')::integer,0) between 0 and 10000
  and coalesce((payment_fee_bps->>'CREDIT_CARD')::integer,0) between 0 and 10000
  and coalesce((payment_fee_bps->>'OTHER')::integer,0) between 0 and 10000
);

alter table public.professionals
  add column if not exists phone text,
  add column if not exists whatsapp_phone text,
  add column if not exists receive_booking_whatsapp boolean not null default false,
  add column if not exists financial_model public.professional_financial_model not null default 'BUSINESS_KEEPS_ALL',
  add column if not exists financial_value integer not null default 0,
  add column if not exists payment_receiver public.payment_receiver not null default 'BUSINESS',
  add column if not exists pix_key text;

alter table public.professionals drop constraint if exists professionals_financial_value_check;
alter table public.professionals add constraint professionals_financial_value_check check (
  financial_value >= 0
  and (financial_model <> 'PERCENTAGE_COMMISSION' or financial_value <= 10000)
);

alter table public.payments
  add column if not exists gross_amount_cents integer,
  add column if not exists fee_cents integer not null default 0,
  add column if not exists net_amount_cents integer,
  add column if not exists receiver public.payment_receiver not null default 'BUSINESS';

update public.payments set gross_amount_cents = amount_cents where gross_amount_cents is null;
update public.payments set net_amount_cents = amount_cents - fee_cents where net_amount_cents is null;
alter table public.payments alter column gross_amount_cents set not null;
alter table public.payments alter column net_amount_cents set not null;
alter table public.payments drop constraint if exists payments_fee_snapshot_check;
alter table public.payments add constraint payments_fee_snapshot_check check (
  gross_amount_cents > 0 and fee_cents >= 0 and fee_cents <= gross_amount_cents
  and net_amount_cents = gross_amount_cents - fee_cents
  and amount_cents = gross_amount_cents
);

create or replace function private.set_payment_financial_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_fee_bps integer := 0;
begin
  new.gross_amount_cents := coalesce(new.gross_amount_cents,new.amount_cents);
  select coalesce((b.payment_fee_bps->>new.method::text)::integer,0),p.payment_receiver
    into v_fee_bps,new.receiver
    from public.appointments a
    join public.businesses b on b.id=a.business_id
    join public.professionals p on p.id=a.professional_id and p.business_id=a.business_id
    where a.id=new.appointment_id and a.business_id=new.business_id;
  new.fee_cents := round(new.gross_amount_cents::numeric*v_fee_bps/10000)::integer;
  new.net_amount_cents := new.gross_amount_cents-new.fee_cents;
  new.amount_cents := new.gross_amount_cents;
  return new;
end;
$$;

drop trigger if exists payments_financial_snapshot on public.payments;
create trigger payments_financial_snapshot before insert on public.payments
  for each row execute function private.set_payment_financial_snapshot();

create index if not exists payments_business_receiver_paid_idx
  on public.payments (business_id, receiver, paid_at desc) where status = 'PAID';
create index if not exists professionals_business_active_financial_idx
  on public.professionals (business_id, active, financial_model);

create or replace function public.get_financial_summary(p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_business_id uuid;
  v_scheduled bigint := 0;
  v_realized bigint := 0;
  v_received bigint := 0;
  v_receivable bigint := 0;
  v_expenses bigint := 0;
  v_generated bigint := 0;
  v_paid_commission bigint := 0;
  v_business_received bigint := 0;
begin
  select bm.business_id into v_business_id from public.business_members bm
    where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;

  select coalesce(sum(coalesce(a.price_cents_snapshot,0)),0) into v_scheduled
    from public.appointments a where a.business_id=v_business_id
    and a.starts_at>=p_start and a.starts_at<p_end and a.status<>'CANCELLED';
  select coalesce(sum(coalesce(a.realized_total_cents,0)),0) into v_realized
    from public.appointments a where a.business_id=v_business_id
    and a.completed_at>=p_start and a.completed_at<p_end and a.status='COMPLETED';
  select coalesce(sum(p.gross_amount_cents),0),
         coalesce(sum(p.net_amount_cents) filter (where p.receiver='BUSINESS'),0)
    into v_received, v_business_received from public.payments p
    where p.business_id=v_business_id and p.paid_at>=p_start and p.paid_at<p_end and p.status='PAID';
  v_receivable := greatest(v_realized - v_received, 0);
  select coalesce(sum(e.amount_cents),0) into v_expenses from public.expenses e
    where e.business_id=v_business_id
    and e.expense_date >= (p_start at time zone (select timezone from public.businesses where id=v_business_id))::date
    and e.expense_date < (p_end at time zone (select timezone from public.businesses where id=v_business_id))::date
    and e.status='ACTIVE';
  select coalesce(sum(c.commission_cents) filter (where c.status<>'VOIDED'),0),
         coalesce(sum(c.commission_cents) filter (where c.status='PAID'),0)
    into v_generated, v_paid_commission from public.commission_entries c
    where c.business_id=v_business_id and c.created_at>=p_start and c.created_at<p_end;

  return jsonb_build_object(
    'scheduled_cents',v_scheduled,'realized_cents',v_realized,
    'received_cents',v_received,'receivable_cents',v_receivable,
    'expenses_cents',v_expenses,'commission_generated_cents',v_generated,
    'commission_paid_cents',v_paid_commission,
    'cash_balance_cents',v_business_received-v_expenses-v_paid_commission,
    'commission_cents',v_generated,
    'pending_appointments',(select count(*) from public.appointments a where a.business_id=v_business_id
      and a.status='CONFIRMED' and a.ends_at<=now() and a.ends_at>=p_start and a.ends_at<p_end),
    'by_method',coalesce((select jsonb_object_agg(method,total) from (
      select p.method::text method,sum(p.gross_amount_cents) total from public.payments p
      where p.business_id=v_business_id and p.paid_at>=p_start and p.paid_at<p_end and p.status='PAID'
      group by p.method) x),'{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_financial_summary(timestamptz,timestamptz) from public, anon;
grant execute on function public.get_financial_summary(timestamptz,timestamptz) to authenticated;

