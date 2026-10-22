-- Replace the user-editable tags on one owned photo atomically.
-- The function runs with the caller's privileges so the defects RLS policy remains in force.

create or replace function public.replace_photo_defects(p_photo uuid, p_defects jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if jsonb_typeof(p_defects) is distinct from 'array' then
    raise exception 'defects must be a JSON array';
  end if;

  delete from public.defects where photo_id = p_photo;

  insert into public.defects (photo_id, label, bbox, source, confidence)
  select
    p_photo,
    d.value ->> 'label',
    jsonb_build_object(
      'x', (d.value ->> 'x')::double precision,
      'y', (d.value ->> 'y')::double precision,
      'w', (d.value ->> 'w')::double precision,
      'h', (d.value ->> 'h')::double precision
    ),
    d.value ->> 'source',
    nullif(d.value ->> 'conf', '')::integer
  from jsonb_array_elements(p_defects) as d(value);
end;
$$;

revoke all on function public.replace_photo_defects(uuid, jsonb) from public;
grant execute on function public.replace_photo_defects(uuid, jsonb) to authenticated;
