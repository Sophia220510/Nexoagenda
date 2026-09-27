begin;

drop policy if exists blocked_times_select_scoped on public.blocked_times;
create policy blocked_times_select_scoped on public.blocked_times for select to authenticated using (
  private.is_platform_admin((select auth.uid())) or private.is_business_operator(business_id)
  or private.is_current_professional(professional_id,business_id)
);
drop policy if exists blocked_times_insert_scoped on public.blocked_times;
create policy blocked_times_insert_scoped on public.blocked_times for insert to authenticated with check (
  created_by=(select auth.uid()) and (
    private.is_business_operator(business_id) or private.is_current_professional(professional_id,business_id)
  )
);
drop policy if exists blocked_times_update_scoped on public.blocked_times;
create policy blocked_times_update_scoped on public.blocked_times for update to authenticated using (
  private.is_business_operator(business_id)
  or (created_by=(select auth.uid()) and private.is_current_professional(professional_id,business_id))
) with check (
  private.is_business_operator(business_id)
  or (created_by=(select auth.uid()) and private.is_current_professional(professional_id,business_id))
);
drop policy if exists blocked_times_delete_scoped on public.blocked_times;
create policy blocked_times_delete_scoped on public.blocked_times for delete to authenticated using (
  private.is_business_operator(business_id)
  or (created_by=(select auth.uid()) and private.is_current_professional(professional_id,business_id))
);
drop policy if exists blocked_times_select_platform_admin on public.blocked_times;

commit;
