// ============================================================
// 레이아웃 토큰 — 간격/모서리/타이포그래피/그림자. docs/DESIGN.md 참고.
// 간격은 4px 그리드 기준. 임의의 px 값을 화면에 직접 쓰지 말 것.
// ============================================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999, // 알약(상태 배지)
};

export const FONT_SIZE = {
  micro: 10, // 캘린더 셀 내부 바
  caption: 12, // 보조 설명/라벨
  body: 14, // 본문
  title: 16, // 카드 제목/버튼
  heading: 20, // 화면 제목
  display: 28, // 큰 숫자/로그인 타이틀
};

// React Native fontWeight 는 문자열이어야 한다.
export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// 카드/모달 그림자 (iOS shadow* + Android elevation 동시 지정)
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
};

// 최소 터치 영역 (현장에서 장갑 낀 손 — CLAUDE.md UX 원칙)
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 44;
