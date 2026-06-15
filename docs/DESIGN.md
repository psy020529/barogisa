# 바로기사 디자인 시스템

> 이 문서가 UI 규칙의 단일 기준이다. 화면 코드에서 색·간격·폰트 값을 **하드코딩하지 말고**
> `constants/` 토큰을 import 해서 쓴다. 토큰에 없으면 먼저 토큰을 추가하고 문서를 갱신한 뒤 사용한다.
>
> 토큰 위치: `constants/colors.ts` (색), `constants/layout.ts` (간격·모서리·타이포·그림자),
> `constants/labels.ts` (라벨·상태→색 매핑). 모두 `@/constants` 에서 한 번에 import.

---

## 1. 디자인 원칙 (CLAUDE.md UX 원칙 반영)

- **모바일 퍼스트 · 한 손 조작**: 기사는 현장에서 장갑 낀 손으로 쓴다. 터치 영역 최소 `MIN_TOUCH`(44).
- **한 탭 원칙**: 핵심 액션(수락/지원/체크인)은 한 번에. 버튼은 크고 명확하게.
- **지금 할 일을 보여준다**: 각 화면 상단 배너 + 일감 상세의 상태별 안내로 "다음 행동"을 항상 제시.
- **상태는 색으로**: 일감 생애주기는 4색 신호 체계(아래 3장)로 일관되게 표현.
- **한국어 UI**: 모든 라벨·메시지는 한글. 코드값(driver/installation 등)을 화면에 그대로 노출 금지 → `labels.ts` 사용.

---

## 2. 색상 (`constants/colors.ts`)

`palette`(원시 색)는 직접 쓰지 않는다. 화면은 의미 토큰 `COLORS` / `JOB_COLORS` 만 사용한다.

### 2.1 표면 · 텍스트
| 토큰 | 용도 |
|---|---|
| `COLORS.bg` | 화면 기본 배경 (흰색) |
| `COLORS.surface` | 카드·입력 배경 (연회색) |
| `COLORS.border` | 테두리·구분선 |
| `COLORS.overlay` | 모달 딤 배경 |
| `COLORS.text` / `textMuted` / `textLight` | 본문 / 보조 / 비활성·플레이스홀더 |
| `COLORS.textInverse` | 어두운/컬러 배경 위 텍스트 (흰색) |

### 2.2 브랜드 · 피드백 (색 + 연한 표면색 쌍)
| 의미 | 강조색 | 표면색(배경) | 용도 |
|---|---|---|---|
| 브랜드 | `primary` | `primarySurface` | 기본 버튼, 선택 강조 |
| 성공 | `success` | `successSurface` | 완료·확정 알림 |
| 주의 | `warning` | `warningSurface`(+`warningBorder`) | **안내 배너**, 경고 박스 |
| 위험 | `danger` | `dangerSurface` | 거절·삭제·오류 |
| 정보 | `info` | `infoSurface` | 거리/계산 결과 등 보조 정보 박스 |

> 규칙: 연한 배경 박스는 항상 `xxxSurface` 토큰을 쓴다. (예전 `#FFF8E1`, `#EEF4FB` 같은 직접값 금지)

### 2.3 달력 주말
`COLORS.weekendSun`(일=빨강), `COLORS.weekendSat`(토=파랑) — 날짜 숫자 색에만 사용.

---

## 3. 일감 상태 색 체계 (`JOB_COLORS` + `JOB_STATUS_TONE`)

일감의 생애주기는 **의미 4색**으로 표현한다. 캘린더·일감 상세·지원자 목록 등 모든 곳에서 동일.

| 색 | 토큰 | 의미 | 해당 상태 |
|---|---|---|---|
| 🔴 빨강 | `JOB_COLORS.new` | **신규 · 지원 가능** (내가 행동해야 함) | 미지원 공개 일감, 나에게 온 지명(`requested`) |
| 🟡 노랑 | `JOB_COLORS.wait` | **대기** (상대 행동 대기) | 지원함→공장 선택 대기, 수락함(`accepted`)→공장 확정 대기 |
| 🔵 파랑 | `JOB_COLORS.active` | **확정 · 진행** | `confirmed`, `checked_in` |
| 🟢 초록 | `JOB_COLORS.done` | **완료 · 수금** | `completed`, `paid` |
| ⚪ 회색 | `JOB_COLORS.inactive` | 종료(표시 안 함) | `rejected`, `cancelled` |

- 내 일감 상태→색은 `JOB_STATUS_TONE[status]` 로 매핑 후 `JOB_COLORS[tone]`.
- 공개 일감은 지원 여부로: 미지원=`new`, 지원함=`wait`.
- 라벨은 맥락에 따라 다를 수 있으나(예: "지원함 · 선택 대기") **색은 위 매핑을 벗어나지 않는다.**

---

## 4. 타이포그래피 (`FONT_SIZE`, `FONT_WEIGHT`)

| 크기 토큰 | px | 용도 |
|---|---|---|
| `display` | 28 | 큰 숫자, 로그인 타이틀 |
| `heading` | 20 | 화면 제목 |
| `title` | 16 | 카드 제목, 버튼 텍스트 |
| `body` | 14 | 본문 |
| `caption` | 12 | 보조 설명, 라벨, 상태 pill |
| `micro` | 10 | 캘린더 셀 내부 바 |

굵기는 `FONT_WEIGHT`(문자열): `regular 400 / medium 500 / semibold 600 / bold 700 / extrabold 800`.
- 제목·금액·버튼: `bold`~`extrabold`. 본문: `regular`~`medium`. 라벨: `semibold`.

---

## 5. 간격 · 모서리 · 그림자 (`SPACING`, `RADIUS`, `SHADOW`)

- **간격(4px 그리드)**: `xs 4 / sm 8 / md 12 / lg 16 / xl 24 / xxl 32`. 화면 좌우 패딩 기본 `md`~`lg`, 섹션 간 `lg`~`xl`.
- **모서리**: `sm 6`(작은 요소) / `md 10`(카드·버튼·입력) / `lg 14`(큰 카드) / `pill 999`(상태 배지).
- **그림자**: `SHADOW.card`(카드), `SHADOW.modal`(모달). iOS/Android 동시 대응. 남발 금지 — 떠 있어야 하는 요소만.

---

## 6. 컴포넌트 패턴

- **상태 카드(일감)**: 좌측 색 바 ❌. 대신 **카드 전체를 상태색으로 은은히 틴트**(`JOB_SURFACE[tone]`)
  + 제목 앞 **색 점**(`toneDot` 10×10, `JOB_COLORS[tone]`) + 우측 상태 라벨(작은 글씨, 상태색).
  (TimeBlocks 방식 — 면으로 색을 주고 점/텍스트로 강조)
- **일반 카드**: `surface` 배경 + `RADIUS.md`.
- **통계 카드(`components/StatCard`)**: 요약 수치(수익·미수금·건수 등)에 사용.
  라벨(작게·`textMuted`, 위) + 값(크게·`extrabold`, 아래)이 위계. 강조는 **값의 색**(tone)으로만:
  `success`(수익)·`danger`(미수금)·`primary`(건수)·`default`. **좌측 색 바 절대 금지.**
  `size="sm"`(가로 3분할) / `size="lg"`(단독 큰 카드).
- **상태 pill**: 필요 시 `RADIUS.pill` + 상태색 배경 + `textInverse`. (일감 카드엔 점+라벨을 우선)
- **안내 배너**: `warningSurface`+`warningBorder`, 좌측 이모지 신호(🔴🟡🔵), 우측 `›`. 화면당 **가장 급한 1건만**.
- **기본 버튼**: `primary` 배경 / `textInverse` / `title` `bold` / 세로 패딩 `lg`. 비활성 `opacity 0.6`.
  - ⚠️ 가로 액션 행 전용 스타일(`flex:1`)을 세로 레이아웃(모달)에 재사용하면 높이가 붕괴한다 — 분리할 것.
- **입력**: `surface`/흰 배경 + `border` + `RADIUS.md` + 패딩 `md`.
- **주소 입력**: 항상 `components/DaumPostcode`(다음 우편번호) 사용. 거리/장거리는 `services/naver` 로 계산.
- **아이콘**: `@expo/vector-icons` 의 **Ionicons** 로 통일 (탭바·액션). 활성 시 채움(`name`), 비활성 시 `-outline`.

---

## 7. Do / Don't

- ✅ `import { COLORS, SPACING, JOB_COLORS } from '@/constants'`
- ✅ 상태색은 `JOB_STATUS_TONE` → `JOB_COLORS` 경로로만
- ✅ 연한 배경은 `xxxSurface` 토큰
- ❌ `backgroundColor: '#FFF8E1'` 같은 hex 직접값
- ❌ `fontWeight: '600'` 숫자 리터럴 대신 `FONT_WEIGHT.semibold` (신규 코드)
- ❌ 화면에 `driver` / `installation` 등 코드값 노출 (→ `PROCESS_LABEL`, 역할 한글 변환)

---

## 8. 점진 적용 메모

기존 화면의 잔여 직접값은 발견 시 토큰으로 치환한다(보이는 대로 정리). 신규/수정 코드는 처음부터 토큰만 사용.
색·간격 토큰이 부족하면 임의 값 대신 `constants/`에 토큰을 추가하고 이 문서를 갱신한다.
