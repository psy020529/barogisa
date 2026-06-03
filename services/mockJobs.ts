import type { Job } from '@/types';

// Firebase 연결 전 UI 개발/검증용 인메모리 데이터.
// EXPO_PUBLIC_FIREBASE_* 환경변수 설정 후 services/jobs.ts 로 교체 예정.

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

export function listJobsForDriver(driverId: string): Job[] {
  return jobs.filter((j) => j.driverId === driverId);
}

export function listJobsForFactory(factoryId: string): Job[] {
  return jobs.filter((j) => j.factoryId === factoryId);
}

export function getJob(id: string): Job | undefined {
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

export function createJob(input: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'status'>): string {
  const id = `job-${Date.now()}`;
  const now = Date.now();
  jobs = [...jobs, { ...input, id, status: 'requested', createdAt: now, updatedAt: now }];
  notify();
  return id;
}

export function updateJobStatus(id: string, status: Job['status'], patch: Partial<Job> = {}): void {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch, status, updatedAt: Date.now() } : j));
  notify();
}
