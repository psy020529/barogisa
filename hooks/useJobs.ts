import { useEffect, useState } from 'react';
import {
  subscribeToApplicants,
  subscribeToDriverJobs,
  subscribeToFactoryJobs,
  subscribeToJob,
  subscribeToMyApplications,
  subscribeToOpenJobs,
} from '@/services/jobsApi';
import type { Job, JobApplication } from '@/types';

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
  const [job, setJob] = useState<Job | undefined>();
  useEffect(() => {
    if (!id) return;
    return subscribeToJob(id, setJob);
  }, [id]);
  return job;
}

// 모집 중인 공개 일감 (일감 찾기 탭)
export function useOpenJobs(): Job[] {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => subscribeToOpenJobs(setJobs), []);
  return jobs;
}

// 기사 본인의 지원 내역
export function useMyApplications(driverId: string | undefined): JobApplication[] {
  const [apps, setApps] = useState<JobApplication[]>([]);
  useEffect(() => {
    if (!driverId) return;
    return subscribeToMyApplications(driverId, setApps);
  }, [driverId]);
  return apps;
}

// 공장: 특정 일감의 지원자 목록
export function useApplicants(jobId: string | undefined): JobApplication[] {
  const [apps, setApps] = useState<JobApplication[]>([]);
  useEffect(() => {
    if (!jobId) return;
    return subscribeToApplicants(jobId, setApps);
  }, [jobId]);
  return apps;
}
