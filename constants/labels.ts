import type { JobProcess, JobStatus } from '@/types';
import type { JobTone } from './colors';

export const PROCESS_LABEL: Record<JobProcess, string> = {
  installation: '시공',
  cutting: '재단',
  assembly: '조립',
  cleaning: '청소·뒷마무리',
  faucet: '수전',
  delivery: '용달',
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  requested: '요청됨',
  accepted: '수락 (공장 확인 대기)',
  rejected: '거절',
  confirmed: '확정',
  checked_in: '시공 중',
  completed: '완료',
  paid: '수금 완료',
  cancelled: '취소',
};

// 일감 상태 → 의미 색 토큰(JOB_COLORS 키). 색은 이 매핑으로만 결정한다.
export const JOB_STATUS_TONE: Record<JobStatus, JobTone> = {
  requested: 'new',
  accepted: 'wait',
  confirmed: 'active',
  checked_in: 'active',
  completed: 'done',
  paid: 'done',
  rejected: 'inactive',
  cancelled: 'inactive',
};
