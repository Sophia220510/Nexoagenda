-- Map explicit professional financial models onto the existing, audited commission engine.
-- Service-specific rules remain supported and take precedence over this default rule.

update public.professionals p set
  financial_model = case r.type
    when 'PERCENTAGE'::public.commission_type then 'PERCENTAGE_COMMISSION'::public.professional_financial_model
    else 'FIXED_COMMISSION'::public.professional_financial_model end,
  financial_value = r.value
from public.professional_commission_rules r
where r.professional_id=p.id and r.business_id=p.business_id
  and r.service_id is null and r.active;

create or replace function public.update_professional_financial_model(
  p_professional_id uuid,
  p_financial_model public.professional_financial_model,
  p_financial_value integer,
  p_payment_receiver public.payment_receiver,
  p_pix_key text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid;
  v_rule_type public.commission_type;
  v_rule_value integer;
begin
  select p.business_id into v_business_id from public.professionals p
    where p.id=p_professional_id for update;
  if v_business_id is null then raise exception 'professional_not_found' using errcode='P0002'; end if;
  if not private.is_business_owner(v_business_id) then raise exception 'owner_required' using errcode='42501'; end if;
  if p_financial_value < 0 or (p_financial_model='PERCENTAGE_COMMISSION' and p_financial_value>10000)
    then raise exception 'invalid_financial_value' using errcode='22023'; end if;

  update public.professionals set
    financial_model=p_financial_model,
    financial_value=case when p_financial_model in ('PROFESSIONAL_KEEPS_ALL','BUSINESS_KEEPS_ALL') then 0 else p_financial_value end,
    payment_receiver=p_payment_receiver,
    pix_key=nullif(trim(p_pix_key),'')
  where id=p_professional_id;

  update public.professional_commission_rules set active=false
    where professional_id=p_professional_id and service_id is null;

  if p_financial_model <> 'BUSINESS_KEEPS_ALL' then
    if p_financial_model='PROFESSIONAL_KEEPS_ALL' then
      v_rule_type := 'PERCENTAGE'; v_rule_value := 10000;
    elsif p_financial_model='PERCENTAGE_COMMISSION' then
      v_rule_type := 'PERCENTAGE'; v_rule_value := p_financial_value;
    else
      v_rule_type := 'FIXED'; v_rule_value := p_financial_value;
    end if;
    insert into public.professional_commission_rules(
      business_id,professional_id,service_id,type,value,active
    ) values(v_business_id,p_professional_id,null,v_rule_type,v_rule_value,true)
    on conflict (professional_id) where service_id is null do update set
      type=excluded.type,value=excluded.value,active=true,updated_at=now();
  end if;

  insert into public.financial_audit_logs(
    business_id,actor_user_id,action,entity_type,entity_id,after_data
  ) values(v_business_id,auth.uid(),'PROFESSIONAL_FINANCIAL_MODEL_UPDATED','professional',p_professional_id,
    jsonb_build_object('financial_model',p_financial_model,'financial_value',p_financial_value,
      'payment_receiver',p_payment_receiver));
end;
$$;

revoke all on function public.update_professional_financial_model(uuid,public.professional_financial_model,integer,public.payment_receiver,text) from public,anon;
grant execute on function public.update_professional_financial_model(uuid,public.professional_financial_model,integer,public.payment_receiver,text) to authenticated;

