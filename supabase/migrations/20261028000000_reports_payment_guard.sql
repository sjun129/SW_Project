-- Clients may create pending reports, but only a trusted payment webhook may mark one paid.
-- The service role bypasses RLS; no client update/delete policy is granted here.

drop policy if exists reports_owner on public.reports;
drop policy if exists reports_owner_select on public.reports;
create policy reports_owner_select on public.reports for select to authenticated
  using (owns_lease(lease_id));

drop policy if exists reports_owner_insert_pending on public.reports;
create policy reports_owner_insert_pending on public.reports for insert to authenticated
  with check (owns_lease(lease_id) and status = 'pending');
