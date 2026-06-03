import type { CheckRecord, CheckType, JobStatus } from '@/types';
import { updateJobStatus } from './jobsApi';

// MVP: 인메모리 보관 + 사진은 localPhotoUri 만 기록.
// Supabase 연결 후 → check_records 테이블 + Storage 업로드(스프린트 2)
// 오프라인 큐 영구화 → AsyncStorage + NetInfo (스프린트 3)

const records: CheckRecord[] = [];

export async function saveCheckRecord(
  input: Omit<CheckRecord, 'id' | 'syncedAt'>,
): Promise<CheckRecord> {
  const record: CheckRecord = {
    ...input,
    id: `chk-${Date.now()}`,
    syncedAt: undefined,
  };
  records.push(record);

  const nextStatus: JobStatus = input.type === 'in' ? 'checked_in' : 'completed';
  const patch = input.type === 'in' ? { checkInId: record.id } : { checkOutId: record.id };
  await updateJobStatus(input.jobId, nextStatus, patch);

  return record;
}

export function getRecords(): CheckRecord[] {
  return [...records];
}
