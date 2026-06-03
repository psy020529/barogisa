import { useEffect, useState } from 'react';
import { subscribeToDriverJobs, subscribeToFactoryJobs, subscribeToJob } from '@/services/jobsApi';
import type { Job } from '@/types';

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
