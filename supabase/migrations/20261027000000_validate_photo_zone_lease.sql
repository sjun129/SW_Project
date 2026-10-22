-- A photo's inspection stage and zone must belong to the same lease.
-- Enforce this on the server so clients cannot create cross-home photo records.
create or replace function public.validate_photo_zone_lease() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1
      from public.inspections i
      join public.zones z on z.lease_id = i.lease_id
     where i.id = new.inspection_id
       and z.id = new.zone_id
  ) then
    raise exception '사진의 점검 단계와 구역은 같은 집에 속해야 해요.';
  end if;
  return new;
end $$;

drop trigger if exists photos_validate_zone_lease on public.photos;
create trigger photos_validate_zone_lease
  before insert on public.photos
  for each row execute function public.validate_photo_zone_lease();
