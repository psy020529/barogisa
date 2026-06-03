import type { DriverJobType } from './user';

// MVP 5단계 흐름에 대응하는 상태값
// requested → accepted(주황) → confirmed → checked_in → completed → paid
export type JobStatus =
  | 'requested'   // 공장 등록, 기사 미응답
  | 'accepted'    // 기사 수락, 공장 최종 미확정 (주황)
  | 'rejected'    // 기사 거절
  | 'confirmed'   // 공장 최종 확정 (확정 일정)
  | 'checked_in'  // 현장 도착, 시공 진행 중
  | 'completed'   // 시공 완료 (체크아웃)
  | 'paid'        // 수금 완료
  | 'cancelled';

export type JobProcess = DriverJobType;

export interface Job {
  id: string;
  factoryId: string;
  factoryName: string; // 화면 표시용 캐시 (조인 회피)
  driverId: string;    // 공장이 지명한 기사
  date: string;        // ISO 날짜 (YYYY-MM-DD)
  process: JobProcess;
  address: string;
  amount: number;      // 단가 (원)
  longDistance?: boolean;
  notes?: string;
  status: JobStatus;
  checkInId?: string;
  checkOutId?: string;
  paidAt?: number;
  createdAt: number;
  updatedAt: number;
}
