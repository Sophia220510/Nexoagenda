begin;

create or replace function public.update_appointment_note(p_appointment_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'note_too_long' using errcode = '22001'; end if;
  update public.appointments a set notes = nullif(trim(p_notes), ''), updated_at = now()
  where a.id = p_appointment_id and exists (
    select 1 from public.business_members bm where bm.business_id = a.business_id
      and bm.user_id = auth.uid() and bm.role = 'OWNER'
  );
  if not found then raise exception 'appointment_not_found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.update_customer_notes(p_customer_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_notes, '')) > 4000 then raise exception 'note_too_long' using errcode = '22001'; end if;
  update public.customers c set notes = nullif(trim(p_notes), ''), updated_at = now()
  where c.id = p_customer_id and exists (
    select 1 from public.business_members bm where bm.business_id = c.business_id
      and bm.user_id = auth.uid() and bm.role = 'OWNER'
  );
  if not found then raise exception 'customer_not_found' using errcode = 'P0002'; end if;
end;
$$;

revoke insert, update on public.appointments from authenticated;
revoke all on function public.update_appointment_note(uuid, text) from public, anon;
revoke all on function public.update_customer_notes(uuid, text) from public, anon;
grant execute on function public.update_appointment_note(uuid, text) to authenticated;
grant execute on function public.update_customer_notes(uuid, text) to authenticated;

commit;
