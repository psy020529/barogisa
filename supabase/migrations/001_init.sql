-- 바로기사 스키마 초기화
-- 기존 Supabase 프로젝트에서 실행할 경우 정책/테이블 충돌 가능 → 새 프로젝트 권장.

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('driver','factory')),
  name text not null,
  phone text,
  driver_job_type text check (driver_job_type in ('installation','cutting','assembly','cleaning','faucet','delivery')),
  driver_tier text check (driver_tier in ('standard','premium')),
  factory_id uuid,
  push_token text,
  created_at timestamptz not null default now()
);

create table public.factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  contact_phone text not null,
  default_address text,
  created_at timestamptz not null default now()
);

alter table public.users
  add constraint users_factory_id_fkey
  foreign key (factory_id) references public.factories(id) on delete set null;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete restrict,
  factory_name text not null,
  driver_id uuid not null references public.users(id) on delete restrict,
  date date not null,
  process text not null check (process in ('installation','cutting','assembly','cleaning','faucet','delivery')),
  address text not null,
  amount integer not null check (amount >= 0),
  long_distance boolean,
  notes text,
  status text not null default 'requested' check (
    status in ('requested','accepted','rejected','confirmed','checked_in','completed','paid','cancelled')
  ),
  check_in_id uuid,
  check_out_id uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_driver_date_idx on public.jobs (driver_id, date desc);
create index jobs_factory_created_idx on public.jobs (factory_id, created_at desc);
create index jobs_status_idx on public.jobs (status);

create table public.check_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  driver_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('in','out')),
  timestamp timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  photo_url text,
  synced_at timestamptz default now()
);

create index check_records_job_idx on public.check_records (job_id);
create index check_records_driver_idx on public.check_records (driver_id, timestamp desc);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_updated_at_trg
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.factories enable row level security;
alter table public.jobs enable row level security;
alter table public.check_records enable row level security;

-- users: 본인 row 관리 + 인증 사용자는 다른 user 조회 가능 (지명 발주에 필요)
create policy "users self insert" on public.users
  for insert with check (auth.uid() = id);
create policy "users self update" on public.users
  for update using (auth.uid() = id);
create policy "users authenticated read" on public.users
  for select using (auth.role() = 'authenticated');

-- factories: 인증 사용자 조회 가능, 본인이 owner인 경우만 관리
create policy "factories authenticated read" on public.factories
  for select using (auth.role() = 'authenticated');
create policy "factories owner insert" on public.factories
  for insert with check (auth.uid() = owner_user_id);
create policy "factories owner update" on public.factories
  for update using (auth.uid() = owner_user_id);

-- jobs
create policy "jobs driver read" on public.jobs
  for select using (driver_id = auth.uid());
create policy "jobs factory read" on public.jobs
  for select using (
    factory_id in (select id from public.factories where owner_user_id = auth.uid())
  );
create policy "jobs factory insert" on public.jobs
  for insert with check (
    factory_id in (select id from public.factories where owner_user_id = auth.uid())
  );
create policy "jobs driver update" on public.jobs
  for update using (driver_id = auth.uid());
create policy "jobs factory update" on public.jobs
  for update using (
    factory_id in (select id from public.factories where owner_user_id = auth.uid())
  );

-- check_records: 본인 driver만 insert/select, 공장은 본인 발주의 record select
create policy "check_records driver insert" on public.check_records
  for insert with check (driver_id = auth.uid());
create policy "check_records driver select" on public.check_records
  for select using (driver_id = auth.uid());
create policy "check_records factory select" on public.check_records
  for select using (
    job_id in (
      select id from public.jobs
      where factory_id in (select id from public.factories where owner_user_id = auth.uid())
    )
  );

-- ============================================================
-- Realtime publication
-- ============================================================

alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.check_records;

-- ============================================================
-- Storage bucket (체크인 사진)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do nothing;

create policy "checkin photos driver upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'checkin-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "checkin photos driver read" on storage.objects
  for select to authenticated using (
    bucket_id = 'checkin-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
