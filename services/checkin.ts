import type { CheckRecord, CheckType, JobStatus } from '@/types';
import { updateJobStatus } from './mockJobs';

// MVP: 인메모리 저장 + 오프라인 큐(추후 AsyncStorage 도입 task)
// Firebase 연결 후 Firestore + Storage 업로드로 교체.

const records: CheckRecord[] = [];

export function saveCheckRecord(input: Omit<CheckRecord, 'id' | 'syncedAt'>): CheckRecord {
  const record: CheckRecord = {
    ...input,
    id: `chk-${Date.now()}`,
    syncedAt: undefined, // task 14에서 업로드 후 채움
  };
  records.push(record);

  const nextStatus: JobStatus = input.type === 'in' ? 'checked_in' : 'completed';
  const patch = input.type === 'in' ? { checkInId: record.id } : { checkOutId: record.id };
  updateJobStatus(input.jobId, nextStatus, patch);

  return record;
}

export function getRecords(): CheckRecord[] {
  return [...records];
}
