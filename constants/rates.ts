import type { JobProcess } from '@/types';

// 시장 표준 단가 (원) — 공장 일감 등록 시 자동 입력 기본값
export const STANDARD_RATES: Record<JobProcess, number> = {
  installation: 350000, // 시공기사 기본
  cutting: 350000,      // 재단기사
  assembly: 290000,     // 조립알바
  cleaning: 0,          // 청소·뒷마무리 — 별도 협의 (CLAUDE.md "별도")
  faucet: 0,            // 수전 전문 — 별도 협의
  delivery: 0,          // 전문 용달 — 별도 협의
};

export const LONG_DISTANCE_SURCHARGE = 50000; // 장거리 추가
