begin;

create or replace function public.book_internal_appointment(
  p_professional_id uuid, p_service_id uuid, p_starts_at timestamptz,
  p_customer_id uuid default null, p_customer_name text default null,
  p_customer_phone text default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid; v_slug text; v_role text; v_name text; v_phone text; v_id uuid;
begin
  select bm.business_id,b.slug,bm.role::text into v_business_id,v_slug,v_role
  from public.business_members bm join public.businesses b on b.id=bm.business_id and b.active
  where bm.user_id=auth.uid() and bm.role::text in ('OWNER','RECEPTIONIST') limit 1;
  if v_business_id is null then raise exception 'operator_required' using errcode='42501'; end if;
  if not exists(select 1 from public.professionals p where p.id=p_professional_id and p.business_id=v_business_id and p.active)
  then raise exception 'professional_not_found' using errcode='P0002'; end if;
  if p_customer_id is not null then
    select c.name,c.phone into v_name,v_phone from public.customers c where c.id=p_customer_id and c.business_id=v_business_id;
    if v_name is null then raise exception 'customer_not_found' using errcode='P0002'; end if;
  else
    v_name:=p_customer_name; v_phone:=p_customer_phone;
  end if;
  if char_length(trim(coalesce(v_name,'')))<2 or char_length(trim(coalesce(v_phone,'')))<8
  then raise exception 'customer_required' using errcode='22023'; end if;
  v_id:=public.book_public_appointment(v_slug,p_professional_id,p_service_id,p_starts_at,v_name,v_phone,gen_random_uuid());
  update public.appointments set notes=nullif(trim(p_notes),''),appointment_source=v_role,
    created_by_user_id=auth.uid(),updated_at=now() where id=v_id and business_id=v_business_id;
  return v_id;
end; $$;

revoke all on function public.book_internal_appointment(uuid,uuid,timestamptz,uuid,text,text,text) from public,anon;
grant execute on function public.book_internal_appointment(uuid,uuid,timestamptz,uuid,text,text,text) to authenticated;

commit;
