-- 자취실록 #2: landlord photo access, original verification, persisted notifications
-- Run once in Supabase Dashboard → SQL Editor after 20261020000000_init.sql.

-- ---------------------------------------------------------------- landlord can see photos (FR-09)
-- The tenant creates time-limited signed URLs when sending the link (bucket stays private);
-- they expire with the link, so nothing is publicly listed.
alter table public.confirmations add column if not exists photo_urls jsonb not null default '{}'::jsonb;

create or replace function public.landlord_view(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c confirmations; result jsonb;
begin
  select * into c from confirmations where token = p_token;
  if not found or c.expires_at < now() then raise exception 'link expired or invalid'; end if;
  if c.status = 'sent' then
    update confirmations set status = 'viewed', viewed_at = now() where id = c.id;
    c.status := 'viewed';
  end if;
  select jsonb_build_object(
    'address', l.address,
    'status', c.status,
    'signer', c.signer_name,
    'expires_at', c.expires_at,
    'photos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'zone', z.name, 'url', c.photo_urls ->> p.id::text, 'server_ts', p.server_ts, 'sha256', p.sha256,
        'defects', (select coalesce(jsonb_agg(jsonb_build_object('label', d.label, 'bbox', d.bbox)), '[]') from defects d where d.photo_id = p.id))
      order by z.sort, p.server_ts) from photos p join zones z on z.id = p.zone_id where p.inspection_id = c.inspection_id), '[]'))
  into result
  from inspections i join leases l on l.id = i.lease_id where i.id = c.inspection_id;
  return result;
end $$;

-- ---------------------------------------------------------------- original verification (FR-18)
-- Anyone holding a photo can check whether its SHA-256 was registered, and when. Reveals no address or owner.
create or replace function public.verify_hash(p_sha256 text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('found', true, 'server_ts', p.server_ts, 'zone', z.name, 'stage', i.type,
                               'confirmed', exists (select 1 from confirmations c where c.inspection_id = i.id and c.status = 'signed'))
       from photos p join zones z on z.id = p.zone_id join inspections i on i.id = p.inspection_id
      where p.sha256 = lower(trim(p_sha256)) order by p.server_ts limit 1),
    jsonb_build_object('found', false));
$$;
revoke all on function public.verify_hash(text) from public;
grant execute on function public.verify_hash(text) to anon, authenticated;

-- ---------------------------------------------------------------- notifications / activity (FR-11)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  kind text not null check (kind in ('activity', 'notice')),
  icon text,
  tone text,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists events_lease_idx on public.events(lease_id, created_at desc);
alter table public.events enable row level security;
drop policy if exists events_owner on public.events;
create policy events_owner on public.events for all to authenticated
  using (owns_lease(lease_id)) with check (owns_lease(lease_id));

-- the landlord's view/answer becomes a tenant notification even though the landlord has no account
create or replace function public.confirmations_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_lease uuid;
begin
  if new.status = old.status then return new; end if;
  select lease_id into v_lease from inspections where id = new.inspection_id;
  insert into events (lease_id, kind, icon, tone, title, body) values (
    v_lease, 'notice',
    case new.status when 'viewed' then 'eye' when 'signed' then 'check-circle' else 'alert-triangle' end,
    case new.status when 'viewed' then 'accent' when 'signed' then 'ok' else 'red' end,
    case new.status when 'viewed' then '임대인이 확인서를 열어 봤어요'
                    when 'signed' then coalesce(new.signer_name, '임대인') || ' 님이 확인했어요'
                    else '임대인이 이의를 남겼어요' end,
    case new.status when 'viewed' then '열람 기록이 증빙으로 저장됐어요'
                    when 'signed' then '입주 기록이 잠겨 퇴거 비교의 기준점이 됐어요'
                    else coalesce(new.comment, '항목을 고쳐 다시 보낼 수 있어요') end);
  return new;
end $$;
drop trigger if exists confirmations_notify on public.confirmations;
create trigger confirmations_notify after update of status on public.confirmations
  for each row execute function public.confirmations_notify();
