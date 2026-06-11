-- 회원 탈퇴 RPC.
-- 클라이언트(anon key)는 auth.users 를 직접 지울 수 없으므로 SECURITY DEFINER 함수로 제공한다.
-- 호출자는 자신의 계정만 삭제할 수 있다 (auth.uid() 기준).
--
-- 삭제 순서가 중요하다: jobs.driver_id / check_records.driver_id 가
-- on delete restrict 라서 본인 데이터를 먼저 지워야 users 삭제가 통과된다.
-- auth.users 를 지우면 public.users(cascade) → factories(cascade) 가 연쇄 삭제된다.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '인증된 사용자가 아닙니다';
  end if;

  -- 1) 본인이 기사로 남긴 체크인/아웃 기록
  delete from public.check_records where driver_id = uid;

  -- 2) 본인이 기사로 배정된 일감 + 본인 소유 공장의 일감
  --    (job 삭제 시 check_records 는 job_id cascade 로 함께 삭제)
  delete from public.jobs
  where driver_id = uid
     or factory_id in (select id from public.factories where owner_user_id = uid);

  -- 3) auth 계정 삭제 → public.users / factories 는 cascade 로 정리
  delete from auth.users where id = uid;
end;
$$;

-- 로그인한 사용자만 실행 가능
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
