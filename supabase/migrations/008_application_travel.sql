-- 지원에 거리 계산 결과 저장 + 선택 시 장거리 할증 자동 반영.
--
-- 기사가 지원할 때 (출발지 → 현장) 거리를 계산해 지원 레코드에 기록한다.
-- 공장이 그 지원자를 선택(select_applicant)하는 순간, 장거리 지원이면
-- jobs.amount 에 할증 50,000원을 합산하고 long_distance = true 로 기록한다.
-- (장거리는 기사-일감 쌍의 속성이므로 "선택된 기사" 기준으로 단가가 확정된다)

alter table public.job_applications
  add column if not exists travel_km double precision,
  add column if not exists travel_minutes integer,
  add column if not exists long_distance boolean not null default false;

create or replace function public.select_applicant(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.job_applications;
  v_job public.jobs;
  v_surcharge integer := 50000; -- 장거리 할증 (constants/rates.ts LONG_DISTANCE_SURCHARGE 와 일치)
begin
  select * into v_app from public.job_applications where id = p_application_id;
  if v_app is null then
    raise exception '지원 내역을 찾을 수 없습니다';
  end if;

  select * into v_job from public.jobs where id = v_app.job_id;
  if v_job is null then
    raise exception '일감을 찾을 수 없습니다';
  end if;

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
  set driver_id = v_app.driver_id,
      status = 'confirmed',
      long_distance = v_app.long_distance,
      amount = amount + case when v_app.long_distance then v_surcharge else 0 end
  where id = v_job.id;

  update public.job_applications
  set status = 'selected'
  where id = v_app.id;

  update public.job_applications
  set status = 'rejected'
  where job_id = v_job.id and id <> v_app.id and status = 'pending';
end;
$$;
