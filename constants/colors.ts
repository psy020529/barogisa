// ============================================================
// 색상 토큰 (단일 소스). 화면에서 색을 직접 hex로 쓰지 말고 여기서 가져온다.
// 규칙은 docs/DESIGN.md 참고.
// ============================================================

// 원시 팔레트 — 직접 쓰지 말 것. 아래 의미 토큰(COLORS)을 통해서만 사용.
const palette = {
  white: '#FFFFFF',
  black: '#111827',

  blue: '#2D7DD2',
  blueDark: '#1E5BA0',
  blueSurface: '#EAF2FB', // 파랑 10% 배경 (선택/정보)

  green: '#3FA34D',
  greenSurface: '#E8F5E9',

  red: '#E63946',
  redSurface: '#FDECEA',

  amber: '#F4A261',
  amberSurface: '#FFF8E1', // 배너/주의 배경
  amberBorder: '#FFE082',

  gray900: '#111827',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray200: '#E5E7EB',
  gray100: '#F7F8FA',

  sunday: '#E0524E',
  saturday: '#3B6FD4',
};

// ── 의미 토큰 (화면에서 쓰는 것) ──────────────────────────────────────────────
export const COLORS = {
  // 표면 / 배경
  bg: palette.white, // 화면 기본 배경
  surface: palette.gray100, // 카드/입력 배경
  card: palette.gray100, // = surface (레거시 별칭, 기존 코드 호환)
  border: palette.gray200, // 테두리/구분선
  overlay: 'rgba(0,0,0,0.4)', // 모달 딤

  // 텍스트
  text: palette.gray900, // 본문/제목
  textMuted: palette.gray500, // 보조 설명
  textLight: palette.gray400, // 비활성/플레이스홀더
  textInverse: palette.white, // 어두운 배경 위 텍스트

  // 브랜드
  primary: palette.blue,
  primaryDark: palette.blueDark,
  primarySurface: palette.blueSurface, // 선택/강조 배경

  // 상태(피드백)
  success: palette.green,
  successSurface: palette.greenSurface,
  warning: palette.amber,
  warningSurface: palette.amberSurface, // 안내 배너 배경
  warningBorder: palette.amberBorder,
  danger: palette.red,
  dangerSurface: palette.redSurface,
  info: palette.blue,
  infoSurface: palette.blueSurface,

  // 달력 주말
  weekendSun: palette.sunday,
  weekendSat: palette.saturday,
};

// ── 일감 상태 색 체계 (의미 4색) ─────────────────────────────────────────────
// 화면(캘린더/일감 상세/지원자 목록)은 이 토큰만 사용한다. docs/DESIGN.md 표 참고.
//   new    빨강 — 신규 / 지원 가능 (내가 행동해야 함)
//   wait   노랑 — 대기 (지원함→선택 대기 / 수락함→확정 대기)
//   active 파랑 — 확정 · 진행
//   done   초록 — 완료 · 수금
export const JOB_COLORS = {
  new: COLORS.danger,
  wait: COLORS.warning,
  active: COLORS.primary,
  done: COLORS.success,
  inactive: COLORS.textLight, // 거절/취소
};

export type JobTone = keyof typeof JOB_COLORS;

// 레거시 별칭 — 기존 import 호환용. 신규 코드는 JOB_COLORS 사용.
export const SCHEDULE_COLORS = {
  myJob: JOB_COLORS.active,
  companyJob: JOB_COLORS.done,
  newJob: JOB_COLORS.new,
  pending: JOB_COLORS.wait,
  open: JOB_COLORS.new,
};
