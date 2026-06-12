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

// direct = 기사 지명 발주 (기존 흐름) | open = 공개 모집 (기사 탐색·지원)
export type JobListingType = 'direct' | 'open';

export type JobApplicationStatus = 'pending' | 'selected' | 'rejected';

export interface JobApplication {
  id: string;
  jobId: string;
  driverId: string;
  driverName?: string; // 공장 지원자 목록 표시용 (조인)
  status: JobApplicationStatus;
  // 이번 지원에 한해 지정한 출발지 (없으면 프로필 기본 출발지 사용)
  startAddress?: string;
  startLat?: number;
  startLon?: number;
  // 지원 시점에 계산한 출발지 → 현장 거리 (선택 시 장거리 할증 자동 반영 근거)
  travelKm?: number;
  travelMinutes?: number;
  longDistance: boolean;
  createdAt: number;
}

export interface Job {
  id: string;
  factoryId: string;
  factoryName: string; // 화면 표시용 캐시 (조인 회피)
  driverId?: string;   // 지명 발주 기사. 공개 모집(open)은 선택 전까지 비어 있음
  listingType: JobListingType;
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
