-- 지원 단위 출발지 오버라이드.
-- 기본은 프로필 출발지(users.start_*)지만, 기사가 특정 현장에 지원할 때
-- 그 건에 한해 다른 출발지를 지정할 수 있다 (전날 숙소에서 출발 등).
-- null이면 프로필 기본 출발지를 사용한 지원이라는 뜻.

alter table public.job_applications
  add column if not exists start_address text,
  add column if not exists start_lat double precision,
  add column if not exists start_lon double precision;
