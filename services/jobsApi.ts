// hasSupabaseConfig 여부에 따라 실제 Supabase 서비스 vs mock 데이터 자동 선택.
// 화면/훅에선 항상 여기서 import.

import * as mock from './mockJobs';
import * as real from './jobs';
import { hasSupabaseConfig } from './supabase';

const api = hasSupabaseConfig ? real : mock;

export const listJobsForDriver = api.listJobsForDriver;
export const listJobsForFactory = api.listJobsForFactory;
export const getJob = api.getJob;
export const subscribeToDriverJobs = api.subscribeToDriverJobs;
export const subscribeToFactoryJobs = api.subscribeToFactoryJobs;
export const subscribeToJob = api.subscribeToJob;
export const createJob = api.createJob;
export const updateJobStatus = api.updateJobStatus;
