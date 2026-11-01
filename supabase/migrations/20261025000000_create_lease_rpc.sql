-- Create a home with its default zones and inspections as one transaction.
-- All statements execute as the signed-in caller, preserving the existing RLS rules.

create or replace function public.create_lease_with_defaults(
  p_address text,
  p_start date,
  p_end date,
  p_deposit bigint,
  p_landlord text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lease uuid;
begin
  update public.leases
     set is_current = false
   where user_id = auth.uid() and is_current = true;

  insert into public.leases (address, start_date, end_date, deposit, landlord_contact)
  values (p_address, p_start, p_end, p_deposit, nullif(p_landlord, ''))
  returning id into v_lease;

  insert into public.zones (lease_id, name, tip, sort)
  values
    (v_lease, '현관', '바닥 타일과 현관문 하단이 함께 보이게 찍어 주세요', 0),
    (v_lease, '벽지', '창가 쪽 벽 모서리를 위주로, 곰팡이·들뜸을 가까이서', 1),
    (v_lease, '바닥', '침대·책상 자리 바닥의 찍힘과 스크래치를 비스듬히', 2),
    (v_lease, '욕실 실리콘', '세면대·욕조 실리콘 줄눈이 화면 가운데 오게', 3),
    (v_lease, '창틀', '레일과 방충망 모서리를 함께 담아 주세요', 4),
    (v_lease, '옵션 가전', '냉장고·세탁기 문을 연 상태로 내부까지', 5);

  insert into public.inspections (lease_id, type)
  values (v_lease, 'move_in'), (v_lease, 'living'), (v_lease, 'move_out');

  return v_lease;
end;
$$;

revoke all on function public.create_lease_with_defaults(text, date, date, bigint, text) from public;
grant execute on function public.create_lease_with_defaults(text, date, date, bigint, text) to authenticated;

create or replace function public.set_current_lease(p_lease uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from public.leases where id = p_lease and user_id = auth.uid()) then
    raise exception '집을 찾을 수 없어요.';
  end if;

  update public.leases
     set is_current = false
   where user_id = auth.uid() and is_current = true;

  update public.leases
     set is_current = true
   where id = p_lease and user_id = auth.uid();
end;
$$;

revoke all on function public.set_current_lease(uuid) from public;
grant execute on function public.set_current_lease(uuid) to authenticated;
