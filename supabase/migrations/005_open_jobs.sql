-- 공개 일감 풀 + 지원 흐름 (베타 스프린트 A)
--
-- 일감 공급 2경로:
--   direct(지명): 기존 흐름 그대로 — 공장이 기사를 지명해 발주
--   open(공개):   기사 미정으로 등록 → 기사들이 탐색·지원 → 공장이 지원자 선택 → confirmed
--
-- 상태 흐름:
--   direct: requested → accepted → confirmed → checked_in → completed → paid
--   open:   requested(모집중) → [지원/선택] → confirmed → ...  (accepted 단계 없음)

-- ============================================================
-- 1) jobs 확장
-- ============================================================
alter table public.jobs alter column driver_id drop not null;

alter table public.jobs
  add column if not exists listing_type text not null default 'direct'
  check (listing_type in ('direct', 'open'));

-- 공개 모집 건은 모든 인증 사용자(기사)가 탐색 가능
create policy "jobs open read" on public.jobs
  for select using (listing_type = 'open' and auth.role() = 'authenticated');

-- ============================================================
-- 2) 지원 테이블
-- ============================================================
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  driver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'selected', 'rejected')),
  created_at timestamptz not null default now(),
  unique (job_id, driver_id)
);

create index job_applications_job_idx on public.job_applications (job_id);
create index job_applications_driver_idx on public.job_applications (driver_id, created_at desc);

alter table public.job_applications enable row level security;

-- 기사: 본인 지원만 생성/조회
create policy "applications driver insert" on public.job_applications
  for insert with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.listing_type = 'open'
        and j.driver_id is null and j.status = 'requested'
    )
  );
create policy "applications driver select" on public.job_applications
  for select using (driver_id = auth.uid());

-- 공장: 본인 일감의 지원자 조회
create policy "applications factory select" on public.job_applications
  for select using (
    job_id in (
      select j.id from public.jobs j
      join public.factories f on f.id = j.factory_id
      where f.owner_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.job_applications;

-- ============================================================
-- 3) 지원자 선택 RPC (공장 owner 전용, 트랜잭션)
--    선택된 기사 배정 + confirmed, 나머지 지원 일괄 rejected
-- ============================================================
create or replace function public.select_applicant(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.job_applications;
  v_job public.jobs;
begin
  select * into v_app from public.job_applications where id = p_application_id;
  if v_app is null then
    raise exception '지원 내역을 찾을 수 없습니다';
  end if;

  select * into v_job from public.jobs where id = v_app.job_id;
  if v_job is null then
    raise exception '일감을 찾을 수 없습니다';
  end if;

  -- 호출자가 해당 일감의 공장 소유주인지 검증
  if not exists (
    select 1 from public.factories f
    where f.id = v_job.factory_id and f.owner_user_id = auth.uid()
  ) then
    raise exception '이 일감의 지원자를 선택할 권한이 없습니다';
  end if;

  if v_job.listing_type <> 'open' or v_job.driver_id is not null or v_job.status <> 'requested' then
    raise exception '이미 마감되었거나 공개 모집 일감이 아닙니다';
  end if;

  update public.jobs
  set driver_id = v_app.driver_id, status = 'confirmed'
  where id = v_job.id;

  update public.job_applications
  set status = 'selected'
  where id = v_app.id;

  update public.job_applications
  set status = 'rejected'
  where job_id = v_job.id and id <> v_app.id and status = 'pending';
end;
$$;

revoke all on function public.select_applicant(uuid) from public;
revoke all on function public.select_applicant(uuid) from anon;
grant execute on function public.select_applicant(uuid) to authenticated;
