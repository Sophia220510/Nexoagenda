begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_business_member(uuid) set schema private;
alter function public.is_business_owner(uuid) set schema private;
alter function public.is_current_professional(uuid, uuid) set schema private;

revoke all on function private.is_business_member(uuid) from public, anon;
revoke all on function private.is_business_owner(uuid) from public, anon;
revoke all on function private.is_current_professional(uuid, uuid) from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.is_business_owner(uuid) to authenticated;
grant execute on function private.is_current_professional(uuid, uuid) to authenticated;

-- These RPCs are called through a server-side client without a user session.
revoke execute on function public.get_public_business(text) from authenticated;
revoke execute on function public.get_public_availability(text, uuid, uuid, date) from authenticated;
revoke execute on function public.book_public_appointment(text, uuid, uuid, timestamptz, text, text, uuid) from authenticated;

commit;
