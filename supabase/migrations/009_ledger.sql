-- 기록·정산 장부 (피벗 — plan/PIVOT-PLAN.md)
-- 1차 사용자 = 시공 팀장 단일 역할. 모든 데이터는 owner_id(auth.uid) 소유.
-- 매칭 관련(jobs/job_applications 등)은 Phase 2로 보존(건드리지 않음).

-- ============================================================
-- 거래처
-- ============================================================
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('factory', 'interior', 'dealer', 'personal')),
  location text,
  trades text[] not null default '{}',
  contact_name text,
  contact_phone text,
  created_at timestamptz not null default now()
);
create index partners_owner_idx on public.partners (owner_id, created_at desc);

-- ============================================================
-- 거래처별 단가표 (공종 → 일당)
-- ============================================================
create table public.rate_tables (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  trade text not null,
  daily_rate integer not null check (daily_rate >= 0),
  unique (partner_id, trade)
);
create index rate_tables_partner_idx on public.rate_tables (partner_id);

-- ============================================================
-- 팀원 (비가입 — 팀장이 이름만 등록)
-- ============================================================
create table public.members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create index members_owner_idx on public.members (owner_id, created_at desc);

-- ============================================================
-- 작업 기록 ★ 중심 엔티티
-- ============================================================
create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete restrict,
  date date not null,
  work_type text not null default 'install' check (work_type in ('install', 'measure', 'cut', 'as')),
  member_ids uuid[] not null default '{}',
  days integer not null default 1 check (days >= 1),
  unit_rate integer not null default 0,   -- 기록 시점 단가 스냅샷
  amount integer not null default 0,       -- = unit_rate * len(member_ids) * days (수기 보정 가능)
  is_manual boolean not null default false,
  photos text[] not null default '{}',
  memo text,
  payment text not null default 'unpaid' check (payment in ('unpaid', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index work_logs_owner_date_idx on public.work_logs (owner_id, date desc);
create index work_logs_partner_idx on public.work_logs (partner_id);
create index work_logs_payment_idx on public.work_logs (owner_id, payment);

-- ============================================================
-- 사용자 설정 (정산 메시지용 계좌 등)
-- ============================================================
create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  bank_account text,
  account_holder text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS — 전부 owner 본인만
-- ============================================================
alter table public.partners enable row level security;
alter table public.rate_tables enable row level security;
alter table public.members enable row level security;
alter table public.work_logs enable row level security;
alter table public.user_settings enable row level security;

create policy "partners owner all" on public.partners
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- rate_tables 는 partner 소유주 기준
create policy "rate_tables owner all" on public.rate_tables
  for all using (
    partner_id in (select id from public.partners where owner_id = auth.uid())
  ) with check (
    partner_id in (select id from public.partners where owner_id = auth.uid())
  );

create policy "members owner all" on public.members
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "work_logs owner all" on public.work_logs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "user_settings owner all" on public.user_settings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================
-- Realtime (캘린더 즉시 반영)
-- ============================================================
alter publication supabase_realtime add table public.work_logs;
alter publication supabase_realtime add table public.partners;

-- ============================================================
-- Storage — 작업 사진
-- ============================================================
insert into storage.buckets (id, name, public)
values ('work-photos', 'work-photos', false)
on conflict (id) do nothing;

create policy "work photos owner upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'work-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "work photos owner read" on storage.objects
  for select to authenticated using (
    bucket_id = 'work-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
