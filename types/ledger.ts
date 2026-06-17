// 기록·정산 장부 도메인 타입 (피벗 — plan/PIVOT-PLAN.md)

export type PartnerType = 'factory' | 'interior' | 'dealer' | 'personal';

export interface RateItem {
  id?: string;
  trade: string; // 공종
  dailyRate: number; // 1인 1일 일당 (KRW)
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  location?: string;
  trades: string[];
  contactName?: string;
  contactPhone?: string;
  rates?: RateItem[]; // 조인 로드 시
  createdAt: number;
}

export interface Member {
  id: string;
  name: string;
  phone?: string;
  createdAt: number;
}

export type WorkType = 'install' | 'measure' | 'cut' | 'as';
export type PaymentStatus = 'unpaid' | 'paid';

export interface WorkLog {
  id: string;
  partnerId: string;
  partnerName?: string; // 조인 표시용
  date: string; // YYYY-MM-DD
  workType: WorkType;
  memberIds: string[];
  days: number;
  unitRate: number; // 기록 시점 단가 스냅샷
  amount: number; // unitRate × memberIds.length × days (수기 보정 가능)
  isManual: boolean;
  photos: string[];
  memo?: string;
  payment: PaymentStatus;
  paidAt?: number;
  createdAt: number;
}

export interface UserSettings {
  bankAccount?: string;
  accountHolder?: string;
}

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  factory: '공장',
  interior: '인테리어',
  dealer: '대리점·유통',
  personal: '개인·기타',
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  install: '시공',
  measure: '실측',
  cut: '재단',
  as: 'AS',
};
