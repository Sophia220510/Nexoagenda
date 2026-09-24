-- Reproducible integration audit for a local Supabase instance.
-- Run after `supabase db reset` with:
-- psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/isolation.sql
begin;

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','owner-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Owner A"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','pro-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Professional A"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0000000-0000-4000-8000-000000000001','authenticated','authenticated','owner-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Owner B"}',now(),now());

insert into public.businesses (id,name,slug,phone) values
  ('a1000000-0000-4000-8000-000000000001','Empresa A','empresa-a','+5511999990001'),
  ('b1000000-0000-4000-8000-000000000001','Empresa B','empresa-b','+5511999990002');
insert into public.business_members (business_id,user_id,role) values
  ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','OWNER'),
  ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','PROFESSIONAL'),
  ('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','OWNER');
insert into public.professionals (id,business_id,user_id,name) values
  ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','Professional A'),
  ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',null,'Professional sem login'),
  ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',null,'Professional B');
insert into public.services (id,business_id,name,price_cents,default_duration_minutes) values
  ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Serviço A',3000,30),
  ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Serviço B',3000,30);
insert into public.professional_services (business_id,professional_id,service_id) values
  ('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001');
insert into public.customers (id,business_id,name,phone) values
  ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Customer A','+5511888880001'),
  ('b4000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Customer B','+5511888880002');
insert into public.appointments (id,business_id,professional_id,service_id,customer_id,starts_at,ends_at) values
  ('a5000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','2030-01-02 12:00Z','2030-01-02 12:30Z'),
  ('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','2030-01-02 12:00Z','2030-01-02 12:30Z');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.businesses) <> 1 then raise exception 'Owner A business isolation failed'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'Owner A customer isolation failed'; end if;
  if (select count(*) from public.appointments) <> 1 then raise exception 'Owner A appointment isolation failed'; end if;
  if exists(select 1 from public.customers where id='b4000000-0000-4000-8000-000000000001') then raise exception 'IDOR customer B'; end if;
end $$;

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.appointments) <> 1 then raise exception 'Professional own agenda failed'; end if;
  if exists(select 1 from public.appointments where id='b5000000-0000-4000-8000-000000000001') then raise exception 'Professional cross-tenant IDOR'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'Professional customer scope failed'; end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if (select count(*) from public.customers) <> 0 then raise exception 'Anonymous customer exposure'; end if;
  if (select count(*) from public.appointments) <> 0 then raise exception 'Anonymous appointment exposure'; end if;
  if public.get_public_business('empresa-a') is null then raise exception 'Public business RPC failed'; end if;
  if public.get_public_business('slug-inexistente') is not null then raise exception 'Unknown slug exposure'; end if;
end $$;

reset role;
do $$ begin
  begin
    insert into public.appointments (business_id,professional_id,service_id,customer_id,starts_at,ends_at)
    values ('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','2030-01-02 12:15Z','2030-01-02 12:45Z');
    raise exception 'Overlap was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    insert into public.appointments (business_id,professional_id,service_id,customer_id,starts_at,ends_at,status)
    values ('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','2030-01-02 12:15Z','2030-01-02 12:45Z','CANCELLED');
  exception when others then raise exception 'Cancelled appointment should not block: %', sqlerrm;
  end;
  begin
    insert into public.appointments (business_id,professional_id,service_id,customer_id,starts_at,ends_at)
    values ('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','2030-01-03 12:00Z','2030-01-03 12:30Z');
    raise exception 'Cross-tenant appointment was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

rollback;
select 'isolation audit passed' as result;
