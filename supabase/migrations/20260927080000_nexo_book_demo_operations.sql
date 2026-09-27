begin;

do $$
declare
  v_business uuid; v_owner uuid; v_prof uuid; v_cut uuid; v_brow uuid;
  v_customer uuid; v_appt uuid; v_item uuid; v_start timestamptz; v_n integer;
begin
  select id into v_business from public.businesses where slug='barbearia-nexo-demo';
  if v_business is null then return; end if;
  select user_id into v_owner from public.business_members where business_id=v_business and role='OWNER' limit 1;
  select id into v_prof from public.professionals where business_id=v_business and name='Lucas' limit 1;
  select id into v_cut from public.services where business_id=v_business and name ilike 'Corte masculino' limit 1;
  select id into v_brow from public.services where business_id=v_business and name ilike 'Sobrancelha' limit 1;
  if v_owner is null or v_prof is null or v_cut is null or v_brow is null then return; end if;

  update public.services set price_cents=4500,updated_at=now() where id=v_cut;
  update public.services set price_cents=1500,updated_at=now() where id=v_brow;
  insert into public.professional_services(business_id,professional_id,service_id,active)
    values(v_business,v_prof,v_brow,true) on conflict(professional_id,service_id) do update set active=true;
  insert into public.professional_commission_rules(business_id,professional_id,service_id,type,value,active)
    values(v_business,v_prof,null,'PERCENTAGE',4000,true)
    on conflict(professional_id) where service_id is null do update set type='PERCENTAGE',value=4000,active=true,updated_at=now();

  -- Specific pending appointment used to exercise the complete-attendance wizard.
  if not exists(select 1 from public.appointments where business_id=v_business and notes='DEMO_GABRIEL_PENDING') then
    insert into public.customers(business_id,name,phone) values(v_business,'Gabriel Martins','+5511988887001')
      on conflict(business_id,phone) do update set name=excluded.name returning id into v_customer;
    for v_n in 1..30 loop
      v_start:=date_trunc('day',now())-(v_n||' days')::interval+interval '15 hours';
      exit when not exists(select 1 from public.appointments where professional_id=v_prof and status<>'CANCELLED'
        and tstzrange(starts_at,ends_at,'[)') && tstzrange(v_start,v_start+interval '45 minutes','[)'));
    end loop;
    insert into public.appointments(business_id,professional_id,service_id,customer_id,starts_at,ends_at,status,
      notes,price_cents_snapshot,duration_minutes_snapshot,appointment_source,created_by_user_id)
    values(v_business,v_prof,v_cut,v_customer,v_start,v_start+interval '45 minutes','CONFIRMED',
      'DEMO_GABRIEL_PENDING',4500,45,'OWNER',v_owner);
  end if;

  -- A completed example feeds finance, CRM, reports and commission screens.
  if not exists(select 1 from public.appointments where business_id=v_business and notes='DEMO_COMPLETED_60') then
    insert into public.customers(business_id,name,phone) values(v_business,'Marina Souza','+5511988887002')
      on conflict(business_id,phone) do update set name=excluded.name returning id into v_customer;
    for v_n in 31..60 loop
      v_start:=date_trunc('day',now())-(v_n||' days')::interval+interval '15 hours';
      exit when not exists(select 1 from public.appointments where professional_id=v_prof and status<>'CANCELLED'
        and tstzrange(starts_at,ends_at,'[)') && tstzrange(v_start,v_start+interval '1 hour','[)'));
    end loop;
    insert into public.appointments(business_id,professional_id,service_id,customer_id,starts_at,ends_at,status,notes,
      price_cents_snapshot,duration_minutes_snapshot,appointment_source,created_by_user_id,completed_at,completed_by_user_id,
      realized_total_cents,payment_status)
    values(v_business,v_prof,v_cut,v_customer,v_start,v_start+interval '1 hour','COMPLETED','DEMO_COMPLETED_60',
      4500,45,'OWNER',v_owner,v_start+interval '1 hour',v_owner,6000,'PAID') returning id into v_appt;
    insert into public.appointment_items(business_id,appointment_id,service_id,professional_id,service_name_snapshot,
      unit_price_cents,quantity,duration_minutes_snapshot,commission_type_snapshot,commission_value_snapshot,created_by_user_id)
    values(v_business,v_appt,v_cut,v_prof,'Corte masculino',4500,1,45,'PERCENTAGE',4000,v_owner) returning id into v_item;
    insert into public.commission_entries(business_id,appointment_id,appointment_item_id,professional_id,production_cents,
      commission_type_snapshot,commission_value_snapshot,commission_cents)
    values(v_business,v_appt,v_item,v_prof,4500,'PERCENTAGE',4000,1800);
    insert into public.appointment_items(business_id,appointment_id,service_id,professional_id,service_name_snapshot,
      unit_price_cents,quantity,duration_minutes_snapshot,commission_type_snapshot,commission_value_snapshot,created_by_user_id)
    values(v_business,v_appt,v_brow,v_prof,'Sobrancelha',1500,1,15,'PERCENTAGE',4000,v_owner) returning id into v_item;
    insert into public.commission_entries(business_id,appointment_id,appointment_item_id,professional_id,production_cents,
      commission_type_snapshot,commission_value_snapshot,commission_cents)
    values(v_business,v_appt,v_item,v_prof,1500,'PERCENTAGE',4000,600);
    insert into public.payments(business_id,appointment_id,amount_cents,method,status,paid_at,recorded_by_user_id)
      values(v_business,v_appt,6000,'PIX','PAID',v_start+interval '1 hour',v_owner);
  end if;

  if not exists(select 1 from public.appointments where business_id=v_business and notes='DEMO_NO_SHOW') then
    insert into public.customers(business_id,name,phone) values(v_business,'Bruno Lima','+5511988887003')
      on conflict(business_id,phone) do update set name=excluded.name returning id into v_customer;
    for v_n in 61..90 loop
      v_start:=date_trunc('day',now())-(v_n||' days')::interval+interval '15 hours';
      exit when not exists(select 1 from public.appointments where professional_id=v_prof and status<>'CANCELLED'
        and tstzrange(starts_at,ends_at,'[)') && tstzrange(v_start,v_start+interval '45 minutes','[)'));
    end loop;
    insert into public.appointments(business_id,professional_id,service_id,customer_id,starts_at,ends_at,status,notes,
      price_cents_snapshot,duration_minutes_snapshot,appointment_source,created_by_user_id,realized_total_cents,payment_status)
    values(v_business,v_prof,v_cut,v_customer,v_start,v_start+interval '45 minutes','NO_SHOW','DEMO_NO_SHOW',
      4500,45,'OWNER',v_owner,0,'UNPAID');
  end if;

  if not exists(select 1 from public.expenses where business_id=v_business and description='Produtos de barbearia — demo') then
    insert into public.expenses(business_id,description,category,amount_cents,expense_date,method,notes,recorded_by_user_id)
      values(v_business,'Produtos de barbearia — demo','PRODUCTS',8900,current_date-2,'PIX','Registro demonstrativo',v_owner);
  end if;
end $$;

commit;
