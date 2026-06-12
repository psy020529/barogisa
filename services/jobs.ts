import type { Job, JobApplication, JobApplicationStatus, JobProcess, JobStatus } from '@/types';
import { getSupabase } from './supabase';

type JobRow = {
  id: string;
  factory_id: string;
  factory_name: string;
  driver_id: string | null;
  listing_type: 'direct' | 'open';
  date: string;
  process: JobProcess;
  address: string;
  amount: number;
  long_distance: boolean | null;
  notes: string | null;
  status: JobStatus;
  check_in_id: string | null;
  check_out_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToJob(r: JobRow): Job {
  return {
    id: r.id,
    factoryId: r.factory_id,
    factoryName: r.factory_name,
    driverId: r.driver_id ?? undefined,
    listingType: r.listing_type,
    date: r.date,
    process: r.process,
    address: r.address,
    amount: r.amount,
    longDistance: r.long_distance ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status,
    checkInId: r.check_in_id ?? undefined,
    checkOutId: r.check_out_id ?? undefined,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

export async function listJobsForDriver(driverId: string): Promise<Job[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('*')
    .eq('driver_id', driverId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToJob);
}

export async function listJobsForFactory(factoryId: string): Promise<Job[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('*')
    .eq('factory_id', factoryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToJob);
}

export async function getJob(id: string): Promise<Job | undefined> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data) : undefined;
}

// supabase.channel()은 같은 이름이면 기존 채널 인스턴스를 반환한다. 두 화면이 동시에
// 같은 이름으로 구독하면 이미 subscribe()된 채널에 .on()을 추가하게 되어
// "cannot add postgres_changes callbacks after subscribe()" 런타임 에러가 난다.
// 구독마다 유니크한 채널명을 부여해 원천 차단한다.
let channelSeq = 0;
const uniqueChannel = (prefix: string) => `${prefix}:${++channelSeq}:${Date.now()}`;

export function subscribeToDriverJobs(driverId: string, cb: (jobs: Job[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    listJobsForDriver(driverId)
      .then((jobs) => { if (!cancelled) cb(jobs); })
      .catch((e) => console.error('subscribeToDriverJobs reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel(`jobs:driver:${driverId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `driver_id=eq.${driverId}` },
      reload,
    )
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export function subscribeToFactoryJobs(factoryId: string, cb: (jobs: Job[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    listJobsForFactory(factoryId)
      .then((jobs) => { if (!cancelled) cb(jobs); })
      .catch((e) => console.error('subscribeToFactoryJobs reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel(`jobs:factory:${factoryId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `factory_id=eq.${factoryId}` },
      reload,
    )
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export function subscribeToJob(id: string, cb: (job: Job | undefined) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    getJob(id)
      .then((j) => { if (!cancelled) cb(j); })
      .catch((e) => console.error('subscribeToJob reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel(`job:${id}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
      reload,
    )
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function createJob(
  input: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<string> {
  const row = {
    factory_id: input.factoryId,
    factory_name: input.factoryName,
    driver_id: input.driverId ?? null,
    listing_type: input.listingType,
    date: input.date,
    process: input.process,
    address: input.address,
    amount: input.amount,
    long_distance: input.longDistance ?? null,
    notes: input.notes ?? null,
    status: 'requested' as JobStatus,
  };
  const { data, error } = await getSupabase().from('jobs').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

// 공장이 발주 정보를 전면 수정 (RLS: 본인 공장 일감만 통과)
export async function updateJob(id: string, patch: Partial<Job>): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.process !== undefined) dbPatch.process = patch.process;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.longDistance !== undefined) dbPatch.long_distance = patch.longDistance;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;
  if (patch.driverId !== undefined) dbPatch.driver_id = patch.driverId ?? null;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await getSupabase().from('jobs').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  patch: Partial<Job> = {},
): Promise<void> {
  const dbPatch: Record<string, unknown> = { status };
  if (patch.checkInId !== undefined) dbPatch.check_in_id = patch.checkInId;
  if (patch.checkOutId !== undefined) dbPatch.check_out_id = patch.checkOutId;
  if (patch.paidAt !== undefined) dbPatch.paid_at = new Date(patch.paidAt).toISOString();
  const { error } = await getSupabase().from('jobs').update(dbPatch).eq('id', id);
  if (error) throw error;
}

// ============================================================
// 공개 일감 풀 + 지원 (베타 스프린트 A)
// ============================================================

type ApplicationRow = {
  id: string;
  job_id: string;
  driver_id: string;
  status: JobApplicationStatus;
  start_address: string | null;
  start_lat: number | null;
  start_lon: number | null;
  created_at: string;
  users?: { name: string } | null;
};

function rowToApplication(r: ApplicationRow): JobApplication {
  return {
    id: r.id,
    jobId: r.job_id,
    driverId: r.driver_id,
    driverName: r.users?.name,
    status: r.status,
    startAddress: r.start_address ?? undefined,
    startLat: r.start_lat ?? undefined,
    startLon: r.start_lon ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

// 모집 중인 공개 일감 (기사 미배정 + requested, 오늘 이후)
export async function listOpenJobs(): Promise<Job[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('*')
    .eq('listing_type', 'open')
    .is('driver_id', null)
    .eq('status', 'requested')
    .gte('date', today)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToJob);
}

export function subscribeToOpenJobs(cb: (jobs: Job[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    listOpenJobs()
      .then((jobs) => { if (!cancelled) cb(jobs); })
      .catch((e) => console.error('subscribeToOpenJobs reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel('jobs:open'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, reload)
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export type ApplyStart = { address: string; lat: number; lon: number };

export async function applyToJob(
  jobId: string,
  driverId: string,
  start?: ApplyStart, // 이번 지원용 출발지 (없으면 프로필 기본)
): Promise<void> {
  const { error } = await getSupabase().from('job_applications').insert({
    job_id: jobId,
    driver_id: driverId,
    start_address: start?.address ?? null,
    start_lat: start?.lat ?? null,
    start_lon: start?.lon ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('이미 지원한 일감입니다');
    throw error;
  }
}

// 기사 본인의 지원 내역 (일감찾기 "지원함" 뱃지 + 지원 현황)
export async function listMyApplications(driverId: string): Promise<JobApplication[]> {
  const { data, error } = await getSupabase()
    .from('job_applications')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToApplication);
}

export function subscribeToMyApplications(
  driverId: string,
  cb: (apps: JobApplication[]) => void,
): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    listMyApplications(driverId)
      .then((apps) => { if (!cancelled) cb(apps); })
      .catch((e) => console.error('subscribeToMyApplications reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel(`applications:driver:${driverId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'job_applications', filter: `driver_id=eq.${driverId}` },
      reload,
    )
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// 공장: 특정 일감의 지원자 목록 (이름 조인)
export async function listApplicants(jobId: string): Promise<JobApplication[]> {
  const { data, error } = await getSupabase()
    .from('job_applications')
    .select('*, users(name)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToApplication);
}

export function subscribeToApplicants(
  jobId: string,
  cb: (apps: JobApplication[]) => void,
): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () => {
    listApplicants(jobId)
      .then((apps) => { if (!cancelled) cb(apps); })
      .catch((e) => console.error('subscribeToApplicants reload error', e));
  };
  reload();
  const channel = supabase
    .channel(uniqueChannel(`applications:job:${jobId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'job_applications', filter: `job_id=eq.${jobId}` },
      reload,
    )
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// 공장: 지원자 선택 → 기사 배정 + confirmed + 나머지 자동 거절 (RPC, 트랜잭션)
export async function selectApplicant(applicationId: string): Promise<void> {
  const { error } = await getSupabase().rpc('select_applicant', {
    p_application_id: applicationId,
  });
  if (error) throw error;
}
