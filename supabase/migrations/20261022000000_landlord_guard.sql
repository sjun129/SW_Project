-- 자취실록 #3: the tenant must not be able to "view" or answer their own landlord link.
-- Without this, opening the preview recorded a landlord view, and the tenant could sign on the landlord's behalf.

create or replace function public.is_link_owner(p_confirmation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from confirmations c join inspections i on i.id = c.inspection_id join leases l on l.id = i.lease_id
    where c.id = p_confirmation and l.user_id = auth.uid());
$$;

create or replace function public.landlord_view(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c confirmations; result jsonb; v_owner boolean;
begin
  select * into c from confirmations where token = p_token;
  if not found or c.expires_at < now() then raise exception 'link expired or invalid'; end if;
  v_owner := is_link_owner(c.id);
  -- only a real landlord visit counts as a view; the tenant's own preview does not
  if c.status = 'sent' and not v_owner then
    update confirmations set status = 'viewed', viewed_at = now() where id = c.id;
    c.status := 'viewed';
  end if;
  select jsonb_build_object(
    'address', l.address,
    'status', c.status,
    'signer', c.signer_name,
    'expires_at', c.expires_at,
    'preview', v_owner,
    'photos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'zone', z.name, 'url', c.photo_urls ->> p.id::text, 'server_ts', p.server_ts, 'sha256', p.sha256,
        'defects', (select coalesce(jsonb_agg(jsonb_build_object('label', d.label, 'bbox', d.bbox)), '[]') from defects d where d.photo_id = p.id))
      order by z.sort, p.server_ts) from photos p join zones z on z.id = p.zone_id where p.inspection_id = c.inspection_id), '[]'))
  into result
  from inspections i join leases l on l.id = i.lease_id where i.id = c.inspection_id;
  return result;
end $$;

create or replace function public.landlord_respond(p_token text, p_ok boolean, p_signer text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from confirmations where token = p_token;
  if v_id is not null and is_link_owner(v_id) then raise exception 'the tenant cannot answer their own confirmation link'; end if;
  update confirmations
     set status = case when p_ok then 'signed' else 'objected' end,
         signed_at = now(), signer_name = left(p_signer, 50), comment = left(p_comment, 1000)
   where token = p_token and expires_at > now() and status in ('sent', 'viewed');
  if not found then raise exception 'link expired, invalid, or already answered'; end if;
end $$;
