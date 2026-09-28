create or replace function public.configure_business_mode(p_mode public.business_mode)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid;
  v_professional_id uuid;
  v_name text;
begin
  select bm.business_id into v_business_id from public.business_members bm
    where bm.user_id=auth.uid() and bm.role='OWNER' limit 1;
  if v_business_id is null then raise exception 'owner_required' using errcode='42501'; end if;
  update public.businesses set business_mode=p_mode where id=v_business_id;
  if p_mode='SOLO' then
    select coalesce(nullif(trim(pr.full_name),''),b.name) into v_name
      from public.businesses b left join public.profiles pr on pr.id=auth.uid()
      where b.id=v_business_id;
    select p.id into v_professional_id from public.professionals p
      where p.business_id=v_business_id and p.user_id=auth.uid();
    if v_professional_id is null then
      insert into public.professionals(
        business_id,user_id,name,active,financial_model,payment_receiver
      ) values(v_business_id,auth.uid(),v_name,true,'PROFESSIONAL_KEEPS_ALL','PROFESSIONAL')
      returning id into v_professional_id;
      insert into public.professional_commission_rules(
        business_id,professional_id,service_id,type,value,active
      ) values(v_business_id,v_professional_id,null,'PERCENTAGE',10000,true);
    end if;
  end if;
  return v_professional_id;
end;
$$;

revoke all on function public.configure_business_mode(public.business_mode) from public,anon;
grant execute on function public.configure_business_mode(public.business_mode) to authenticated;

