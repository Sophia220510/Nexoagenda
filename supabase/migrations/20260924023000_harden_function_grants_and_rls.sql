begin;

-- Supabase may grant function execution directly to API roles through default
-- privileges. Internal trigger functions must never be callable as RPCs.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- RLS helpers are intentionally available only to authenticated users.
revoke all on function public.is_business_member(uuid) from public, anon;
revoke all on function public.is_business_owner(uuid) from public, anon;
revoke all on function public.is_current_professional(uuid, uuid) from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.is_current_professional(uuid, uuid) to authenticated;

-- Onboarding is authenticated-only; public catalog/availability/booking RPCs
-- are intentionally callable by both API roles.
revoke all on function public.create_business_with_owner(text, text, text, text) from public, anon;
grant execute on function public.create_business_with_owner(text, text, text, text) to authenticated;

drop policy profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated
using (id = (select auth.uid()));

drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy members_select_self_or_owner on public.business_members;
create policy members_select_self_or_owner on public.business_members for select to authenticated
using (user_id = (select auth.uid()) or public.is_business_owner(business_id));

drop policy professionals_select_scoped on public.professionals;
create policy professionals_select_scoped on public.professionals for select to authenticated
using (public.is_business_owner(business_id) or user_id = (select auth.uid()));

drop policy blocked_times_insert_scoped on public.blocked_times;
create policy blocked_times_insert_scoped on public.blocked_times for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (public.is_business_owner(business_id) or public.is_current_professional(professional_id, business_id))
);

drop policy blocked_times_update_scoped on public.blocked_times;
create policy blocked_times_update_scoped on public.blocked_times for update to authenticated
using (
  public.is_business_owner(business_id)
  or (created_by = (select auth.uid()) and public.is_current_professional(professional_id, business_id))
)
with check (
  public.is_business_owner(business_id)
  or (created_by = (select auth.uid()) and public.is_current_professional(professional_id, business_id))
);

drop policy blocked_times_delete_scoped on public.blocked_times;
create policy blocked_times_delete_scoped on public.blocked_times for delete to authenticated
using (
  public.is_business_owner(business_id)
  or (created_by = (select auth.uid()) and public.is_current_professional(professional_id, business_id))
);

commit;
