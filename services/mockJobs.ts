import type { Job, JobApplication } from '@/types';

// Supabase 연결 전 UI 개발/검증용 인메모리 데이터.
// hasSupabaseConfig === true 이면 services/jobs.ts 가 사용됨.

const today = new Date();
const toIso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

let jobs: Job[] = [
  {
    id: 'job-1',
    factoryId: 'factory-a',
    factoryName: '한솔주방',
    driverId: 'dev-driver-1',
    listingType: 'direct',
    date: toIso(0),
    process: 'installation',
    address: '서울시 강남구 역삼동 123-4',
    amount: 350000,
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'job-2',
    factoryId: 'dev-factory-1',
    factoryName: '테스트 공장',
    driverId: 'dev-driver-1',
    listingType: 'direct',
    date: toIso(2),
    process: 'installation',
    address: '경기도 성남시 분당구 정자동 56-7',
    amount: 350000,
    longDistance: true,
    status: 'requested',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'job-3',
    factoryId: 'factory-a',
    factoryName: '한솔주방',
    driverId: 'dev-driver-1',
    listingType: 'direct',
    date: toIso(5),
    process: 'installation',
    address: '인천시 연수구 송도동 89-1',
    amount: 350000,
    status: 'accepted',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1800000,
  },
  {
    id: 'job-4',
    factoryId: 'factory-c',
    factoryName: '에넥스',
    driverId: 'dev-driver-1',
    listingType: 'direct',
    date: toIso(-7),
    process: 'installation',
    address: '서울시 마포구 합정동 12-3',
    amount: 350000,
    status: 'completed',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'job-5',
    factoryId: 'factory-b',
    factoryName: '리바트키친',
    driverId: 'dev-driver-1',
    listingType: 'direct',
    date: toIso(-14),
    process: 'installation',
    address: '서울시 송파구 잠실동 45-6',
    amount: 350000,
    status: 'paid',
    paidAt: Date.now() - 86400000 * 12,
    createdAt: Date.now() - 86400000 * 17,
    updatedAt: Date.now() - 86400000 * 12,
  },
];

const listeners = new Set<(jobs: Job[]) => void>();
const notify = () => listeners.forEach((cb) => cb([...jobs]));

export async function listJobsForDriver(driverId: string): Promise<Job[]> {
  return jobs.filter((j) => j.driverId === driverId);
}

export async function listJobsForFactory(factoryId: string): Promise<Job[]> {
  return jobs.filter((j) => j.factoryId === factoryId);
}

export async function getJob(id: string): Promise<Job | undefined> {
  return jobs.find((j) => j.id === id);
}

export function subscribeToDriverJobs(driverId: string, cb: (jobs: Job[]) => void): () => void {
  const wrapped = (all: Job[]) => cb(all.filter((j) => j.driverId === driverId));
  listeners.add(wrapped);
  wrapped(jobs);
  return () => {
    listeners.delete(wrapped);
  };
}

export function subscribeToFactoryJobs(factoryId: string, cb: (jobs: Job[]) => void): () => void {
  const wrapped = (all: Job[]) => cb(all.filter((j) => j.factoryId === factoryId));
  listeners.add(wrapped);
  wrapped(jobs);
  return () => {
    listeners.delete(wrapped);
  };
}

export function subscribeToJob(id: string, cb: (job: Job | undefined) => void): () => void {
  const wrapped = (all: Job[]) => cb(all.find((j) => j.id === id));
  listeners.add(wrapped);
  wrapped(jobs);
  return () => {
    listeners.delete(wrapped);
  };
}

export async function createJob(
  input: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<string> {
  const id = `job-${Date.now()}`;
  const now = Date.now();
  jobs = [...jobs, { ...input, id, status: 'requested', createdAt: now, updatedAt: now }];
  notify();
  return id;
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<void> {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j));
  notify();
}

export async function updateJobStatus(
  id: string,
  status: Job['status'],
  patch: Partial<Job> = {},
): Promise<void> {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch, status, updatedAt: Date.now() } : j));
  notify();
}

// ── 공개 일감 풀 + 지원 (mock 최소 구현) ─────────────────────────────────────

let applications: JobApplication[] = [];
const appListeners = new Set<(apps: JobApplication[]) => void>();
const notifyApps = () => appListeners.forEach((cb) => cb([...applications]));

export async function listOpenJobs(): Promise<Job[]> {
  return jobs.filter((j) => j.listingType === 'open' && !j.driverId && j.status === 'requested');
}

export function subscribeToOpenJobs(cb: (jobs: Job[]) => void): () => void {
  const wrapped = (all: Job[]) =>
    cb(all.filter((j) => j.listingType === 'open' && !j.driverId && j.status === 'requested'));
  listeners.add(wrapped);
  wrapped(jobs);
  return () => {
    listeners.delete(wrapped);
  };
}

export async function applyToJob(
  jobId: string,
  driverId: string,
  start?: { address: string; lat: number; lon: number },
  _travel?: { km: number; minutes: number; longDistance: boolean },
): Promise<void> {
  if (applications.some((a) => a.jobId === jobId && a.driverId === driverId)) {
    throw new Error('이미 지원한 일감입니다');
  }
  applications = [
    ...applications,
    {
      id: `app-${Date.now()}`,
      jobId,
      driverId,
      status: 'pending',
      startAddress: start?.address,
      startLat: start?.lat,
      startLon: start?.lon,
      travelKm: _travel?.km,
      travelMinutes: _travel?.minutes,
      longDistance: _travel?.longDistance ?? false,
      createdAt: Date.now(),
    },
  ];
  notifyApps();
}

export async function listMyApplications(driverId: string): Promise<JobApplication[]> {
  return applications.filter((a) => a.driverId === driverId);
}

export function subscribeToMyApplications(
  driverId: string,
  cb: (apps: JobApplication[]) => void,
): () => void {
  const wrapped = (all: JobApplication[]) => cb(all.filter((a) => a.driverId === driverId));
  appListeners.add(wrapped);
  wrapped(applications);
  return () => {
    appListeners.delete(wrapped);
  };
}

export async function listApplicants(jobId: string): Promise<JobApplication[]> {
  return applications.filter((a) => a.jobId === jobId);
}

export function subscribeToApplicants(
  jobId: string,
  cb: (apps: JobApplication[]) => void,
): () => void {
  const wrapped = (all: JobApplication[]) => cb(all.filter((a) => a.jobId === jobId));
  appListeners.add(wrapped);
  wrapped(applications);
  return () => {
    appListeners.delete(wrapped);
  };
}

export async function selectApplicant(applicationId: string): Promise<void> {
  const app = applications.find((a) => a.id === applicationId);
  if (!app) throw new Error('지원 내역을 찾을 수 없습니다');
  jobs = jobs.map((j) =>
    j.id === app.jobId ? { ...j, driverId: app.driverId, status: 'confirmed', updatedAt: Date.now() } : j,
  );
  applications = applications.map((a) =>
    a.jobId === app.jobId
      ? { ...a, status: a.id === applicationId ? 'selected' : 'rejected' }
      : a,
  );
  notify();
  notifyApps();
}
