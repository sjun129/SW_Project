-- 자취실록 #4: stream new notifications to the open app (landlord viewed / signed / objected).
-- Realtime respects RLS, so each tenant only receives events for their own leases.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;
