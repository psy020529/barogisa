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
export const updateJob = api.updateJob;
export const updateJobStatus = api.updateJobStatus;

// 공개 일감 풀 + 지원
export const listOpenJobs = api.listOpenJobs;
export const subscribeToOpenJobs = api.subscribeToOpenJobs;
export const applyToJob = api.applyToJob;
export const listMyApplications = api.listMyApplications;
export const subscribeToMyApplications = api.subscribeToMyApplications;
export const listApplicants = api.listApplicants;
export const subscribeToApplicants = api.subscribeToApplicants;
export const selectApplicant = api.selectApplicant;
