-- Development-only seed. Run with `supabase db reset` against the local stack.
-- It intentionally creates no Auth users; sign up through the app to test onboarding/RLS.

insert into public.businesses (id, name, slug, phone, timezone)
values ('10000000-0000-4000-8000-000000000001', 'Barbearia Horizonte', 'barbearia-horizonte', '+5511999999999', 'America/Sao_Paulo')
on conflict (id) do nothing;

insert into public.professionals (id, business_id, name, bio)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Lucas', 'Especialista em cortes clássicos.'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Pedro', 'Barba e acabamento.'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Carlos', 'Cortes modernos e visagismo.')
on conflict (id) do nothing;

insert into public.services (id, business_id, name, description, price_cents, default_duration_minutes)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Corte masculino', 'Corte e finalização.', 5000, 30),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Barba', 'Modelagem e acabamento.', 3500, 30),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Corte + barba', 'Experiência completa.', 8000, 60)
on conflict (id) do nothing;

insert into public.professional_services (business_id, professional_id, service_id, duration_override_minutes)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', null),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 45),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', null)
on conflict (professional_id, service_id) do nothing;

insert into public.working_hours (business_id, professional_id, weekday, start_time, end_time)
select
  '10000000-0000-4000-8000-000000000001',
  p.id,
  d.weekday,
  d.start_time,
  d.end_time
from public.professionals p
cross join (values
  (1::smallint, '09:00'::time, '12:00'::time),
  (1::smallint, '13:00'::time, '18:00'::time),
  (2::smallint, '09:00'::time, '12:00'::time),
  (2::smallint, '13:00'::time, '18:00'::time),
  (3::smallint, '09:00'::time, '12:00'::time),
  (3::smallint, '13:00'::time, '18:00'::time),
  (4::smallint, '09:00'::time, '12:00'::time),
  (4::smallint, '13:00'::time, '18:00'::time),
  (5::smallint, '09:00'::time, '12:00'::time),
  (5::smallint, '13:00'::time, '18:00'::time),
  (6::smallint, '09:00'::time, '14:00'::time)
) as d(weekday, start_time, end_time)
where p.business_id = '10000000-0000-4000-8000-000000000001';

insert into public.customers (id, business_id, name, phone)
values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Cliente Exemplo', '+5511988888888')
on conflict (id) do nothing;

insert into public.appointments (
  id, business_id, professional_id, service_id, customer_id, starts_at, ends_at, status
)
select
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  date_trunc('day', now()) + interval '1 day 13 hours',
  date_trunc('day', now()) + interval '1 day 13 hours 30 minutes',
  'CONFIRMED'
where not exists (select 1 from public.appointments where id = '50000000-0000-4000-8000-000000000001');
