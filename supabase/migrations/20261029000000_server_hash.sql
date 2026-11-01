-- 자취실록: FR-05 / NFR-01. The evidence hash is the one the server computes from the stored file.
-- The device hash stays as a transfer check. Only the vision function (secret key) writes server_sha256.
alter table public.photos add column if not exists server_sha256 text check (server_sha256 ~ '^[0-9a-f]{64}$');
alter table public.photos add column if not exists server_hash_at timestamptz;

-- Same as init, plus: clients cannot pre-fill the server hash on insert.
create or replace function public.photos_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  new.server_ts := now();
  new.created_by := auth.uid();
  new.server_sha256 := null;
  new.server_hash_at := null;
  select chain_hash into cur from public.inspections where id = new.inspection_id for update;
  new.prev_hash := cur;
  update public.inspections
     set chain_hash = encode(extensions.digest(cur || new.sha256, 'sha256'), 'hex')
   where id = new.inspection_id;
  return new;
end $$;

create or replace function public.verify_hash(p_sha256 text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('found', true, 'server_ts', p.server_ts, 'zone', z.name, 'stage', i.type,
                               'server_verified', p.server_sha256 is not null and p.server_sha256 = p.sha256,
                               'confirmed', exists (select 1 from confirmations c where c.inspection_id = i.id and c.status = 'signed'))
       from photos p join zones z on z.id = p.zone_id join inspections i on i.id = p.inspection_id
      where p.sha256 = lower(trim(p_sha256)) order by p.server_ts limit 1),
    jsonb_build_object('found', false));
$$;
