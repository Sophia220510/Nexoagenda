begin;

create or replace function public.admin_create_business_bundle(p_bundle jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid := (p_bundle->'business'->>'id')::uuid;
begin
  if not private.is_platform_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;

  insert into public.businesses(id,name,business_type,slug,phone,timezone,logo_url,active)
  values (v_business_id, p_bundle->'business'->>'name', p_bundle->'business'->>'business_type',
    p_bundle->'business'->>'slug', p_bundle->'business'->>'phone', p_bundle->'business'->>'timezone',
    nullif(p_bundle->'business'->>'logo_url',''), true);

  insert into public.profiles(id,full_name)
  select (u->>'user_id')::uuid, u->>'name' from jsonb_array_elements(p_bundle->'users') u
  on conflict(id) do update set full_name=excluded.full_name;

  insert into public.login_identities(user_id,username,username_normalized,internal_auth_identifier,active,must_change_password)
  select (u->>'user_id')::uuid, u->>'username', u->>'username', u->>'internal_auth_identifier', true, true
  from jsonb_array_elements(p_bundle->'users') u;

  insert into public.business_members(business_id,user_id,role)
  select v_business_id,(u->>'user_id')::uuid,(u->>'role')::public.member_role
  from jsonb_array_elements(p_bundle->'users') u;

  insert into public.professionals(id,business_id,user_id,name,photo_url,active,setup_completed_at)
  select (u->>'professional_id')::uuid,v_business_id,(u->>'user_id')::uuid,u->>'name',nullif(u->>'photo_url',''),
    coalesce((u->>'active')::boolean,true),case when u->>'role'='OWNER' then now() else null end
  from jsonb_array_elements(p_bundle->'users') u where (u->>'is_professional')::boolean;

  insert into public.services(id,business_id,name,price_cents,default_duration_minutes,active)
  select (s->>'id')::uuid,v_business_id,s->>'name',(s->>'price_cents')::integer,(s->>'duration_minutes')::integer,true
  from jsonb_array_elements(p_bundle->'services') s;

  insert into public.professional_services(business_id,professional_id,service_id,active)
  select v_business_id,(u->>'professional_id')::uuid,(s->>'id')::uuid,true
  from jsonb_array_elements(p_bundle->'users') u cross join jsonb_array_elements(p_bundle->'services') s
  where (u->>'is_professional')::boolean;

  insert into public.admin_audit_logs(actor_user_id,business_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),v_business_id,'BUSINESS_CREATED','business',v_business_id,jsonb_build_object('name',p_bundle->'business'->>'name','slug',p_bundle->'business'->>'slug'));
  insert into public.admin_audit_logs(actor_user_id,business_id,action,entity_type,entity_id,metadata)
  select auth.uid(),v_business_id,case when (u->>'is_professional')::boolean then 'USER_AND_PROFESSIONAL_CREATED' else 'USER_CREATED' end,
    'user',(u->>'user_id')::uuid,jsonb_build_object('username',u->>'username','role',u->>'role')
  from jsonb_array_elements(p_bundle->'users') u;
  return v_business_id;
end; $$;

revoke all on function public.admin_create_business_bundle(jsonb) from public,anon;
grant execute on function public.admin_create_business_bundle(jsonb) to authenticated;
commit;
