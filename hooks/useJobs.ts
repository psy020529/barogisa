import { useEffect, useState } from 'react';
import {
  getJob,
  subscribeToDriverJobs,
  subscribeToFactoryJobs,
} from '@/services/mockJobs';
import type { Job } from '@/types';

// MVP: mock 데이터 기반.
// Firebase 환경변수 설정 후 services/jobs.ts (Firestore onSnapshot) 로 교체.

export function useDriverJobs(driverId: string | undefined): Job[] {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    if (!driverId) return;
    return subscribeToDriverJobs(driverId, setJobs);
  }, [driverId]);
  return jobs;
}

export function useFactoryJobs(factoryId: string | undefined): Job[] {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    if (!factoryId) return;
    return subscribeToFactoryJobs(factoryId, setJobs);
  }, [factoryId]);
  return jobs;
}

export function useJob(id: string | undefined): Job | undefined {
  const [job, setJob] = useState<Job | undefined>(() => (id ? getJob(id) : undefined));
  useEffect(() => {
    if (!id) return;
    // mock 데이터는 jobs 배열 자체가 변경될 수 있으므로 전역 구독 재사용
    return subscribeToDriverJobs('', () => {
      setJob(getJob(id));
    });
  }, [id]);
  return job;
}
