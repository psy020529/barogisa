-- 기사 출발지 (장거리 판정 기준)
-- 장거리는 일감의 속성이 아니라 "기사 출발지 → 현장" 거리로 판정한다.
-- 기사가 프로필에서 출발지를 등록하면, 일감 상세에서 거리/장거리 여부를 보여준다.

alter table public.users
  add column if not exists start_address text,
  add column if not exists start_lat double precision,
  add column if not exists start_lon double precision;

-- update는 기존 "users self update" RLS로 본인만 가능 (추가 정책 불필요)
