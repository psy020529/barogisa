export type UserRole = 'driver' | 'factory';

// 기사 직군 — STANDARD_RATES 키와 일치
export type DriverJobType =
  | 'installation' // 시공기사
  | 'cutting'      // 재단기사
  | 'assembly'     // 조립알바
  | 'cleaning'     // 청소·뒷마무리
  | 'faucet'       // 수전 전문
  | 'delivery';    // 전문 용달

// 시공기사 등급 (가성비/고급) — 단가 차등용
export type DriverTier = 'standard' | 'premium';

export interface DriverProfile {
  jobType: DriverJobType;
  tier?: DriverTier;
  region?: string;
  // 출발지 — 장거리 판정 기준점 (기사 출발지 → 현장 거리)
  startAddress?: string;
  startLat?: number;
  startLon?: number;
}

export interface FactoryProfile {
  factoryId: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  driverProfile?: DriverProfile;
  factoryProfile?: FactoryProfile;
  pushToken?: string;
  isAdmin?: boolean; // 관리자: 양쪽 화면 모두 접근 가능
  createdAt: number;
}
