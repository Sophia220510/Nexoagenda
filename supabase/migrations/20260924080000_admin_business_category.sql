begin;
create or replace function public.admin_update_business_v2(p_business_id uuid,p_name text,p_business_type text,p_phone text,p_logo_url text,p_timezone text,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_platform_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_business_type not in ('BARBERSHOP','SALON','AESTHETICS','CLINIC','OFFICE','TATTOO','MANICURE','PERSONAL_TRAINER','PET_SERVICE','MASSAGE','STUDIO','CONSULTING','OTHER') then raise exception 'invalid_business_type' using errcode='23514'; end if;
 update public.businesses set name=trim(p_name),business_type=p_business_type,phone=p_phone,logo_url=nullif(trim(p_logo_url),''),timezone=p_timezone,active=p_active where id=p_business_id;
 if not found then raise exception 'business_not_found' using errcode='P0002'; end if;
 insert into public.admin_audit_logs(actor_user_id,business_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_business_id,case when p_active then 'BUSINESS_UPDATED_OR_ACTIVATED' else 'BUSINESS_UPDATED_OR_DEACTIVATED' end,'business',p_business_id,jsonb_build_object('name',trim(p_name),'business_type',p_business_type,'active',p_active));
end; $$;
revoke all on function public.admin_update_business_v2(uuid,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.admin_update_business_v2(uuid,text,text,text,text,text,boolean) to authenticated;
commit;
