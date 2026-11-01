-- 하자 신고에 거주 기록 사진을 최대 5장 연결합니다.
alter table public.defect_reports
  add column if not exists photo_ids uuid[] not null default '{}'::uuid[];

do $$ begin
  alter table public.defect_reports
    add constraint defect_reports_photo_ids_limit check (cardinality(photo_ids) <= 5);
exception when duplicate_object then null;
end $$;

create or replace function public.validate_defect_report_photos() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  matched_count int;
begin
  if cardinality(new.photo_ids) > 5 then
    raise exception '하자 신고에는 사진을 최대 5장까지 첨부할 수 있어요.';
  end if;
  if cardinality(new.photo_ids) <> (select count(distinct id) from unnest(new.photo_ids) as ids(id)) then
    raise exception '같은 사진을 중복 첨부할 수 없어요.';
  end if;
  select count(*) into matched_count
    from public.photos p
    join public.inspections i on i.id = p.inspection_id
   where p.id = any(new.photo_ids)
     and i.lease_id = new.lease_id
     and i.type = 'living';
  if matched_count <> cardinality(new.photo_ids) then
    raise exception '현재 집의 거주 기록 사진만 첨부할 수 있어요.';
  end if;
  return new;
end $$;

drop trigger if exists defect_report_photos_validate on public.defect_reports;
create trigger defect_report_photos_validate
  before insert or update of photo_ids, lease_id on public.defect_reports
  for each row execute function public.validate_defect_report_photos();
