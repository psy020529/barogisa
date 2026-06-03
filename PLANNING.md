# 바로기사(Barogisa) — 개발 기획서

> **문서 목적**: 현재 repo(`psy020529/barogisa`) 코드 상태를 기준으로 한 MVP 개발 기획. repo 루트에 `PLANNING.md`로 두고 Claude Code 세션의 기준 문서로 사용한다.
> **작성 기준일**: 2026-06-03 · **기준 커밋**: main (코드 직접 확인 반영)

---

## 0. 한눈에 보는 현재 상태

**MVP UI는 이미 거의 완성되어 in-memory mock 위에서 동작한다.** 5단계 거래 생애주기가 기사·공장 양측 화면으로 모두 구현돼 있고, 단가 자동계산·일정충돌 경고·GPS 체크인·청구서 PDF·정산 그룹핑까지 화면 레벨에서 돌아간다.

**남은 핵심 작업은 "신규 화면 개발"이 아니라 "백엔드(Firebase) 통합 + 네이티브 기능 실연결"이다.** `services/firebase.ts`에 `hasFirebaseConfig` 가드와 lazy init이 이미 준비돼 있어, mock 서비스를 실제 Firestore 서비스로 교체하는 깔끔한 seam이 설계돼 있다.

> 따라서 이 기획서의 무게중심은 **갭 분석(2장) → 통합 로드맵(7장)** 이다.

---

## 1. 제품 개요 (요약)

**바로기사**는 한국 주방가구 설치 시장의 B2B 운영 SaaS다. 시장의 통증은 *일감 발굴·단가 협상*이 아니라(단가는 이미 표준화됨), **여러 공장과 동시 거래하는 설치기사의 거래 추적·정산·수금**이다. 바로기사는 *배차 → 수락/확정 → 현장 체크인/아웃 → 정산 → 수금* 흐름을 단일 원장으로 디지털화한다.

핵심 락인: 공장 연락처는 **앱 내에서만 노출**(`Factory.contactPhone`)해 외부 카톡·전화로의 탈중개를 차단한다.

---

## 2. 현재 구현 상태 (코드 확인 기반)

### 2.1 완성 — UI + 로직 동작 (mock 데이터)

| 영역 | 파일 | 상태 |
|---|---|---|
| 라우팅/진입 | `app/_layout.tsx`, `app/index.tsx` | ✅ 역할 기반 분기(driver→캘린더, factory→공장홈) |
| 로그인 | `app/(auth)/login.tsx` | ⚠️ **개발용 mock 로그인**(역할 선택). 실제 OTP 미연결 |
| 기사 캘린더 | `app/(tabs)/calendar.tsx` | ✅ 요약 3카드(이번달 수익/미수금/이번주 일감) + 멀티닷 + 범례 + 일자별 일감 |
| 일감 상세/수락 | `app/job/[id].tsx` | ✅ 수락/거절 + 같은날 일정충돌 경고 + 상태별 체크인/아웃 버튼 |
| 체크인/아웃 | `app/job/checkin.tsx` | ✅ GPS(expo-location) + 카메라(expo-image-picker) + 저장 |
| 정산 | `app/(tabs)/settlement.tsx` | ✅ 공장별 그룹핑 + 미수금 합계 + 청구서 PDF + 수금완료 처리 |
| 프로필 | `app/(tabs)/profile.tsx` | ⚠️ 최소(이름/역할/전화 + 로그아웃). 단가·지역·수정 없음 |
| 공장 홈 | `app/factory/index.tsx` | ✅ 발주 일감 목록 + 기사 수락건 **최종 확정** |
| 일감 발주 | `app/factory/register.tsx` | ✅ 날짜/공정/주소/지정기사/장거리/단가 자동계산 + 수정 |
| 청구서 PDF | `services/invoicePdf.ts` | ✅ expo-print로 생성·공유 |

### 2.2 모킹 — 실제 백엔드로 교체 필요

| 파일 | 현재 | 교체 대상 |
|---|---|---|
| `services/mockJobs.ts` | 인메모리 배열 + 리스너(구독) | → `services/jobs.ts` (Firestore CRUD + `onSnapshot`) |
| `hooks/useJobs.ts` | mockJobs 구독 | → 실서비스 구독(또는 `hasFirebaseConfig` 분기) |
| `services/checkin.ts` | 인메모리 + 오프라인 큐 placeholder | → Firestore + Storage 업로드 + AsyncStorage 큐 |
| `hooks/useAuth.tsx` | `devSignIn` mock | → Firebase Phone OTP + Firestore user 문서 |

### 2.3 준비됨 — 연결 대기

- `services/firebase.ts`: 실제 Firebase 초기화 코드 완성. `hasFirebaseConfig` 가드, RN persistence(AsyncStorage), Auth/Firestore/Storage getter. **env만 채우면 활성화.**
- `.env.example`: `EXPO_PUBLIC_FIREBASE_*` 6개 키 정의됨(값 비어있음).
- 의존성 설치 완료: `expo-location`, `expo-image-picker`, `expo-notifications`, `expo-print`, `expo-file-system`, `expo-sharing`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`, `firebase`, `react-native-calendars`, `date-fns`.

### 2.4 미구현 (갭)

1. **Firebase 백엔드 실연결** — Firestore 스키마/인덱스/보안규칙 + `services/jobs.ts`
2. **실인증** — Phone OTP, user 문서 생성, 프로필 로딩
3. **사진 업로드** — 현재 `localPhotoUri`만 저장. Storage 업로드 → `photoUrl`, `syncedAt` 채우기
4. **오프라인 동기화 큐** — `CheckRecord`에 `syncedAt`/`localPhotoUri` 필드 + netinfo 의존성 있으나 큐 로직은 placeholder(코드 주석상 "task 14")
5. **푸시 알림** — `expo-notifications` + `User.pushToken` 필드 있으나 등록/발송 없음(신규 발주·확정 시)
6. **기사 디렉토리** — `factory/register.tsx`의 `DEMO_DRIVERS` 하드코딩 → 실제 기사 조회/팀장 관계
7. **프로필 보강** — 등급(tier)·지역·단가 확인·수정

---

## 3. 아키텍처 (실제)

```
[Expo RN App — Expo Router v6, New Arch]
  app/_layout (AuthProvider)
   ├─ index           역할 분기
   ├─ (auth)/login    인증
   ├─ (tabs)          기사: calendar · settlement · profile
   ├─ factory/        공장: index(홈) · register(발주)
   └─ job/            [id](상세) · checkin (modal)
        │
   hooks/ useAuth · useJobs
        │  (현재 mock seam)
   services/ mockJobs · checkin · invoicePdf
        │  ↓ 교체
   services/ firebase.ts  ──→  [Firebase]
                                 Auth(Phone OTP, RN persistence)
                                 Firestore(원장: jobs/users/factories/checkRecords)
                                 Storage(체크인 사진)
                                 (+선택) Cloud Functions: 푸시 발송
```

**설계 강점**: mock과 실서비스가 동일 인터페이스(`subscribeToDriverJobs`, `createJob`, `updateJobStatus`, `saveCheckRecord`)로 분리돼 있어, 화면 코드 변경 없이 서비스 레이어만 교체 가능.

---

## 4. 데이터 모델 (실제 타입 → Firestore 매핑)

타입은 `types/`에 이미 정의됨. Firestore 컬렉션 권장 매핑:

```
users/{userId}          User           (role, name, phone, driverProfile?, factoryProfile?, pushToken?)
factories/{factoryId}   Factory        (name, ownerUserId, contactPhone, defaultAddress?)
jobs/{jobId}            Job            (factoryId, factoryName↓캐시, driverId, date, process,
                                        address, amount, longDistance?, status, checkInId?,
                                        checkOutId?, paidAt?, createdAt, updatedAt)
checkRecords/{recordId} CheckRecord    (jobId, driverId, type in|out, timestamp, lat, lng,
                                        photoUrl?, localPhotoUri?(로컬전용), syncedAt?)
```

- 조회 패턴: 기사용 `jobs where driverId == uid`, 공장용 `jobs where factoryId == fid` → **복합 인덱스**(`driverId`+`date`, `factoryId`+`status`) 필요.
- `factoryName`은 조인 회피용 캐시(이미 Job에 반영됨) — 비정규화 유지.
- 정산은 별도 Invoice 엔티티 없음 — `jobs` 중 `completed|paid`를 공장별로 집계(현 settlement 로직과 일치). MVP에선 이대로 유지.

### 4.1 단가 규칙 (`constants/rates.ts`, 확정)

```
installation 350,000 · cutting 350,000 · assembly 290,000
cleaning/faucet/delivery = 0 (별도 협의) · 장거리 할증 +50,000
```
> cleaning/faucet/delivery는 0원 → 발주 시 단가 수정 입력으로 처리(현 register 화면이 override 지원).

---

## 5. Job 상태 머신 (실제 구현됨)

```
requested ──수락──> accepted ──공장확정──> confirmed ──체크인──> checked_in ──체크아웃──> completed ──수금──> paid
    │                                                                                          
    └──거절──> rejected            (취소: cancelled)
```

- `requested`: 공장 발주, 기사 미응답 (빨강/신규)
- `accepted`: 기사 수락, 공장 미확정 (주황) — *비즈니스 룰의 "주황 상태"와 일치*
- `confirmed`: 공장 최종 확정 (파랑/확정)
- `checked_in` → `completed`: 현장 GPS 체크인/아웃
- `paid`: 수금 완료

각 전이는 `updateJobStatus`로 구현됨. 캘린더 점 색상: requested=신규, accepted=대기, 그 외=내 일정.

---

## 6. MVP 범위 경계

**포함(이미 대부분 구현)**: 역할 분기, 발주, 수락/거절+충돌경고, 공장 확정, GPS 체크인/아웃+사진, 정산 그룹핑, 청구서 PDF, 수금 처리.

**제외(v1 이후, CLAUDE.md 기준)**: 자동 결제/송금, 보증금 실입금, 별점·전문성 인증, 추천 알고리즘, 아카데미, 세금계산서/부가세.

**성공 기준(MVP)**: 실사용 기사 N명이 1주간 종이 없이 발주→체크인→자동정산→미수금 가시화 완주. 정산 집계 수기 대비 불일치 0건.

---

## 7. 통합 로드맵 (갭 → 작업)

> 1인 + Claude Code 기준. 각 스프린트 ≈ 1주(조정 가능). UI는 완성됐으므로 **백엔드/네이티브 통합**에 집중.

### 스프린트 1 — Firebase 백엔드 실연결 ⭐ (최우선)
- Firebase 프로젝트 생성, `.env`에 `EXPO_PUBLIC_FIREBASE_*` 입력 → `hasFirebaseConfig` 활성화
- `services/jobs.ts` 작성: `createJob`/`updateJobStatus`/`subscribeToDriverJobs`/`subscribeToFactoryJobs`를 Firestore(`onSnapshot`)로 1:1 구현 (mockJobs 인터페이스 그대로)
- `hooks/useJobs.ts`를 실서비스로 전환(또는 `hasFirebaseConfig` 분기로 mock 폴백 유지)
- Firestore 보안규칙: 기사/공장 데이터 격리, `contactPhone` 노출 최소화
- 시드 데이터 마이그레이션(현 mock 5건을 시드 스크립트로)
- **완료 기준**: 발주→수락→확정→체크인→완료→수금이 실 DB에 영속

### 스프린트 2 — 인증 + 사진 업로드
- `hooks/useAuth.tsx`: Firebase Phone OTP로 교체, `devSignIn`은 dev 플래그 뒤로
- 가입 시 `users/{uid}` 문서 생성(역할·프로필), `app/index.tsx` 분기 연동
- `services/checkin.ts`: 사진을 Storage 업로드 → `photoUrl` 저장, `syncedAt` 기록
- 프로필 화면에 등급/지역/단가 표시·수정

### 스프린트 3 — 오프라인 + 푸시 (현장 신뢰성)
- 오프라인 큐: `CheckRecord`를 AsyncStorage에 보관, netinfo 복구 시 자동 동기화(코드상 "task 14")
- 체크인은 오프라인에서도 항상 성공(로컬 저장 → 추후 업로드)
- 푸시: Expo push token 등록(`User.pushToken`), 신규 발주·수락·확정 시 알림(Cloud Function 또는 클라이언트 트리거)

### 스프린트 4 — 기사 디렉토리 + 다듬기
- `factory/register.tsx`의 `DEMO_DRIVERS` → 실제 기사 조회(팀장 관계/지명)
- 빈 상태·에러·로딩 정리, 한 손 조작 UX 점검(큰 버튼·최소 탭)
- 접근성·다크모드 점검(현재 light 고정)

### 스프린트 5 — 빌드·배포
- **EAS dev build** 전환 — Expo Go tunnel 한계 탈피, 네이티브 모듈(location/camera/notifications) 안정화
- 내부 테스트(Galaxy) → Play 내부테스트 트랙 → TestFlight(EAS iOS 클라우드 빌드)
- `app.json` 권한 문구(위치/카메라/알림) 점검

> **데모 목표선**: 스프린트 1 종료 시 "실 DB 기반 전 구간" 시연 가능 — 투자자·초기 사용자 데모의 핵심.

---

## 8. 리스크 & 주의

- **WSL2 네트워크**: Expo Go는 tunnel 필수. 네이티브 기능 본격화 시 EAS dev build로 이전(스프린트 5, 가능하면 앞당김).
- **Firebase Phone OTP**: Expo Go에서 reCAPTCHA/네이티브 연동 제약 가능 → dev build 환경에서 검증 권장.
- **New Architecture**(`newArchEnabled: true`): 일부 RN 라이브러리 호환 확인 필요.
- **오프라인 무결성**: 체크인은 절대 유실되면 안 됨 — 로컬 우선 저장 후 동기화가 원칙. 현장 인터넷 불안정 전제.
- **현장 입력 UX**: 기사는 장갑·바쁜 손 → 체크인/수락은 한 탭·큰 버튼 유지(현 구현 방향 적절).
- **단가 0원 직군**(cleaning/faucet/delivery): 발주 시 단가 수정 누락 방지(검증 강화 고려).
- **보안규칙 부재 시 데이터 유출**: 스프린트 1에서 규칙을 반드시 함께 배포.

---

## 9. 다음 액션 (즉시)

1. Firebase 프로젝트 생성 → `.env` 입력 (`hasFirebaseConfig` 켜기)
2. `services/jobs.ts` 작성(mockJobs 인터페이스 복제 + Firestore)
3. `hooks/useJobs.ts` 실서비스 전환, Firestore 인덱스·보안규칙 배포
4. 시드 스크립트로 mock 5건 이전 → 전 구간 실 DB 검증
5. 이후 스프린트 2(인증·사진)로 진행

---

*본 문서는 Claude Code 세션의 기준 컨텍스트다. 코드 변경 시 2장(현재 상태)과 7장(로드맵)을 함께 갱신할 것.*
