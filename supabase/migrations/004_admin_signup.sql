-- 어드민 자동 가입 구조.
--
-- 목적: 지정된 카카오 계정(개발자 본인)으로 가입하면 자동으로 is_admin=true.
-- 카카오 provider_id(회원번호)는 탈퇴-재가입을 반복해도 불변이므로,
-- 허용목록에 한 번 넣어두면 테스트용 탈퇴↔가입 사이클에서 매번 어드민으로 살아난다.
--
-- 보안:
--  - admin_kakao_ids 는 RLS on + 정책 없음 → API(anon/authenticated)로 읽기/쓰기 불가
--  - is_admin 컬럼은 column-level revoke → 클라이언트가 직접 insert/update 불가
--  - 어드민 판정은 SECURITY DEFINER RPC(complete_onboarding) 내부에서만 수행

-- ============================================================
-- 1) 어드민 카카오 계정 허용목록
-- ============================================================
create table if not exists public.admin_kakao_ids (
  provider_id text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.admin_kakao_ids enable row level security;
-- 정책 없음 = PostgREST로 접근 불가 (SQL Editor/definer 함수만 접근)

-- ============================================================
-- 2) 클라이언트의 is_admin 직접 설정 차단
-- ============================================================
revoke insert (is_admin) on public.users from authenticated, anon;
revoke update (is_admin) on public.users from authenticated, anon;

-- ============================================================
-- 3) 온보딩 RPC: users row 생성 + 허용목록 매칭 시 is_admin 자동 부여
-- ============================================================
create or replace function public.complete_onboarding(
  p_role text,
  p_name text,
  p_phone text default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_admin boolean;
  v_row public.users;
begin
  if uid is null then
    raise exception '인증된 사용자가 아닙니다';
  end if;
  if p_role not in ('driver', 'factory') then
    raise exception '잘못된 역할: %', p_role;
  end if;
  if exists (select 1 from public.users where id = uid) then
    raise exception '이미 가입된 사용자입니다';
  end if;

  -- 가입자의 카카오 회원번호가 허용목록에 있으면 어드민
  select exists (
    select 1
    from auth.identities i
    join public.admin_kakao_ids a on a.provider_id = i.provider_id
    where i.user_id = uid and i.provider = 'kakao'
  ) into v_admin;

  insert into public.users (id, role, name, phone, driver_job_type, driver_tier, is_admin)
  values (
    uid,
    p_role,
    p_name,
    nullif(p_phone, ''),
    case when p_role = 'driver' then 'installation' end,
    case when p_role = 'driver' then 'standard' end,
    v_admin
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text) from public;
revoke all on function public.complete_onboarding(text, text, text) from anon;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;

-- ============================================================
-- 4) 시드 (최초 1회, 개발자 본인 등록)
-- ============================================================
-- 본인 카카오 계정으로 "가입된 상태"에서 아래를 실행하면:
--  - 현재 카카오 identity 의 provider_id 를 허용목록에 등록하고
--  - 이미 만들어진 본인 계정도 즉시 어드민으로 승격한다.
-- (실행 시점에 카카오 가입자가 본인뿐이어야 함 — 현재 상황)
--
-- insert into public.admin_kakao_ids (provider_id, note)
-- select provider_id, '개발자 본인' from auth.identities where provider = 'kakao'
-- on conflict (provider_id) do nothing;
--
-- update public.users u set is_admin = true
-- from auth.identities i
-- where i.user_id = u.id and i.provider = 'kakao'
--   and i.provider_id in (select provider_id from public.admin_kakao_ids);
