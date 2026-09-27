begin;

create or replace function public.get_public_business(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',b.id,'name',b.name,'slug',b.slug,'phone',b.phone,'logo_url',b.logo_url,
    'timezone',b.timezone,'description',b.description,'address',b.address,'instagram_url',b.instagram_url,
    'professionals',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'photo_url',p.photo_url,'bio',p.bio,
      'service_ids',coalesce((select jsonb_agg(ps.service_id) from public.professional_services ps
        join public.services s on s.id=ps.service_id and s.business_id=ps.business_id
        where ps.professional_id=p.id and ps.active and s.active),'[]'::jsonb)) order by p.name)
      from public.professionals p where p.business_id=b.id and p.active),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'description',s.description,'price_cents',s.price_cents,
      'default_duration_minutes',s.default_duration_minutes) order by s.name)
      from public.services s where s.business_id=b.id and s.active),'[]'::jsonb)
  ) from public.businesses b where b.slug=lower(trim(p_slug)) and b.active;
$$;

revoke all on function public.get_public_business(text) from public,authenticated;
grant execute on function public.get_public_business(text) to anon;

commit;
