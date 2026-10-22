-- 자취실록 initial schema (spec §9 data model, NFR-01/03/04)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run: objects are created only if missing.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables
create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address text not null,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  deposit bigint not null default 0 check (deposit >= 0),
  landlord_contact text,            -- 3rd-party data: used only for the confirmation link (NFR-04)
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

-- Zones belong to a lease so the same 벽지/욕실 can be compared across move-in / living / move-out.
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  name text not null,
  tip text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  type text not null check (type in ('move_in', 'living', 'move_out')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  chain_hash text not null default repeat('0', 64),
  unique (lease_id, type)
);

-- Photos are evidence: insert + read only. No update/delete policy exists, so RLS blocks both.
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  zone_id uuid not null references public.zones(id) on delete restrict,
  storage_key text not null unique,                       -- path in the "originals" bucket
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  prev_hash text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  device_ts timestamptz,
  server_ts timestamptz not null default now(),           -- forced by trigger, client value ignored (NFR-02)
  gps text,
  created_by uuid not null default auth.uid() references auth.users(id)
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  label text not null,
  bbox jsonb not null,              -- {x,y,w,h} as 0..1 fractions
  severity text,
  source text not null check (source in ('ai', 'user')),
  confidence int check (confidence between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.confirmations (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  channel text,
  status text not null default 'sent' check (status in ('sent', 'viewed', 'signed', 'objected')),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',  -- NFR-03
  viewed_at timestamptz,
  signed_at timestamptz,
  signer_name text,
  comment text
);

create table if not exists public.defect_reports (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  category text not null,
  place text not null,
  memo text,
  repair_requested boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  type text not null check (type in ('compare', 'move_out_only')),
  move_in_id uuid references public.inspections(id),
  move_out_id uuid references public.inspections(id),
  diff jsonb,
  pdf_key text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'issued')),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  amount int not null check (amount > 0),
  pg_tx_id text,
  paid_at timestamptz not null default now()
);

create index if not exists zones_lease_idx on public.zones(lease_id);
create index if not exists photos_inspection_idx on public.photos(inspection_id);
create index if not exists photos_zone_idx on public.photos(zone_id);
create index if not exists defects_photo_idx on public.defects(photo_id);

-- ---------------------------------------------------------------- server-side evidence rules
-- Server time is the evidence time (NFR-02) and the hash chain is extended on the server,
-- so a tampered client cannot backdate photos or rewrite the chain.
create or replace function public.photos_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  new.server_ts := now();
  new.created_by := auth.uid();
  select chain_hash into cur from public.inspections where id = new.inspection_id for update;
  new.prev_hash := cur;
  update public.inspections
     set chain_hash = encode(extensions.digest(cur || new.sha256, 'sha256'), 'hex')
   where id = new.inspection_id;
  return new;
end $$;

drop trigger if exists photos_before_insert on public.photos;
create trigger photos_before_insert before insert on public.photos
  for each row execute function public.photos_before_insert();

-- ---------------------------------------------------------------- ownership helpers
create or replace function public.owns_lease(p_lease uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from leases where id = p_lease and user_id = auth.uid());
$$;

create or replace function public.owns_inspection(p_inspection uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from inspections i join leases l on l.id = i.lease_id
                 where i.id = p_inspection and l.user_id = auth.uid());
$$;

create or replace function public.owns_photo(p_photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from photos p join inspections i on i.id = p.inspection_id
                 join leases l on l.id = i.lease_id where p.id = p_photo and l.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- RLS
alter table public.leases enable row level security;
alter table public.zones enable row level security;
alter table public.inspections enable row level security;
alter table public.photos enable row level security;
alter table public.defects enable row level security;
alter table public.confirmations enable row level security;
alter table public.defect_reports enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;

drop policy if exists leases_owner on public.leases;
create policy leases_owner on public.leases for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists zones_owner on public.zones;
create policy zones_owner on public.zones for all to authenticated
  using (owns_lease(lease_id)) with check (owns_lease(lease_id));

drop policy if exists inspections_owner_select on public.inspections;
create policy inspections_owner_select on public.inspections for select to authenticated using (owns_lease(lease_id));
drop policy if exists inspections_owner_insert on public.inspections;
create policy inspections_owner_insert on public.inspections for insert to authenticated with check (owns_lease(lease_id));
-- no update policy: chain_hash only changes through the photos trigger

drop policy if exists photos_owner_select on public.photos;
create policy photos_owner_select on public.photos for select to authenticated using (owns_inspection(inspection_id));
drop policy if exists photos_owner_insert on public.photos;
create policy photos_owner_insert on public.photos for insert to authenticated with check (owns_inspection(inspection_id));
-- no update/delete policies: originals are immutable (NFR-01)

drop policy if exists defects_owner on public.defects;
create policy defects_owner on public.defects for all to authenticated
  using (owns_photo(photo_id)) with check (owns_photo(photo_id));

drop policy if exists confirmations_owner_select on public.confirmations;
create policy confirmations_owner_select on public.confirmations for select to authenticated using (owns_inspection(inspection_id));
drop policy if exists confirmations_owner_insert on public.confirmations;
create policy confirmations_owner_insert on public.confirmations for insert to authenticated with check (owns_inspection(inspection_id));
-- landlord updates go only through the token RPCs below

drop policy if exists defect_reports_owner on public.defect_reports;
create policy defect_reports_owner on public.defect_reports for all to authenticated
  using (owns_lease(lease_id)) with check (owns_lease(lease_id));

drop policy if exists reports_owner on public.reports;
drop policy if exists reports_owner_select on public.reports;
create policy reports_owner_select on public.reports for select to authenticated using (owns_lease(lease_id));
drop policy if exists reports_owner_insert_pending on public.reports;
create policy reports_owner_insert_pending on public.reports for insert to authenticated
  with check (owns_lease(lease_id) and status = 'pending');

drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments for select to authenticated
  using (exists (select 1 from reports r where r.id = report_id and owns_lease(r.lease_id)));
-- payments are written by the payment webhook (service role), never by the client

-- ---------------------------------------------------------------- landlord link (no app, no login)
create or replace function public.landlord_view(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c confirmations; result jsonb;
begin
  select * into c from confirmations where token = p_token;
  if not found or c.expires_at < now() then raise exception 'link expired or invalid'; end if;
  if c.status = 'sent' then
    update confirmations set status = 'viewed', viewed_at = now() where id = c.id;
  end if;
  select jsonb_build_object(
    'address', l.address,
    'status', coalesce(nullif(c.status, 'sent'), 'viewed'),
    'photos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'zone', z.name, 'storage_key', p.storage_key, 'server_ts', p.server_ts,
        'defects', (select coalesce(jsonb_agg(jsonb_build_object('label', d.label, 'bbox', d.bbox)), '[]') from defects d where d.photo_id = p.id))
      order by p.server_ts) from photos p join zones z on z.id = p.zone_id where p.inspection_id = c.inspection_id), '[]'))
  into result
  from inspections i join leases l on l.id = i.lease_id where i.id = c.inspection_id;
  return result;
end $$;

create or replace function public.landlord_respond(p_token text, p_ok boolean, p_signer text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update confirmations
     set status = case when p_ok then 'signed' else 'objected' end,
         signed_at = now(), signer_name = left(p_signer, 50), comment = left(p_comment, 1000)
   where token = p_token and expires_at > now() and status in ('sent', 'viewed');
  if not found then raise exception 'link expired, invalid, or already answered'; end if;
end $$;

revoke all on function public.landlord_view(text) from public;
revoke all on function public.landlord_respond(text, boolean, text, text) from public;
grant execute on function public.landlord_view(text) to anon, authenticated;
grant execute on function public.landlord_respond(text, boolean, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- storage: immutable originals
insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

-- Path convention: <user_id>/<inspection_id>/<photo_id>.jpg
drop policy if exists originals_insert_own on storage.objects;
create policy originals_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists originals_select_own on storage.objects;
create policy originals_select_own on storage.objects for select to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);
-- no update/delete policies on the bucket: uploaded originals cannot be overwritten or removed
