# 바로기사(Barogisa) — 베타 개발 기획서

> **문서 목적**: 실사용 베타(기사 모집) 마일스톤 기준의 개발 기획. repo 루트의 기준 문서.
> **작성일**: 2026-06-11 · **기준**: main 최신 코드 직접 확인 (이전 Firebase 기준 기획서를 전면 대체)

---

## 0. 확정된 제품 결정 (2026-06-11 기획 회의)

| 쟁점 | 결정 |
|---|---|
| 일감 생성 주체 | **B+C 혼합**: 기사가 자기 거래를 직접 입력(공장은 이름만) + 도어링이 아는 공장 발주 대행(어드민). 공장측 앱 모집은 기사 리텐션 확인 후 |
| 팀장-팀원 기능 | 베타 2차로 연기 (1차는 개인 기사 운영 도구) |
| 체크인 정책 | GPS·사진 자동 시도하되 **실패해도 체크인 성공** + 누락 표시. 오프라인 로컬 저장 → 자동 업로드 |
| 배포 채널 | **APK 직접 배포** + expo-updates OTA로 JS 자동 업데이트 |
| 베타 성공 기준 | 실기사 N명이 1주간 종이 없이 일감기록→체크인→자동정산→미수금 가시화 완주 |

**핵심 논리**: 양면 시장을 동시에 모집하지 않는다. 기사 혼자서도 "수기 정산·미수금 추적"
통증이 해결되도록 직접입력을 1급 기능으로 만들면, 기사 단면만 모집해도 제품이 성립한다.

---

## 1. 현재 상태 (코드 확인 기준)

### 완료 — 실 Supabase 연동
- **인증**: 카카오 네이티브 SDK(@react-native-kakao) + `signInWithIdToken`. 온보딩 RPC,
  회원 탈퇴 RPC, 어드민 자동 부여(admin_kakao_ids 허용목록) 완비. (migrations 001~004)
- **일감 CRUD + 실시간**: `services/jobs.ts` (realtime 채널 구독 포함), `jobsApi.ts` seam
- **공장 엔티티**: `useMyFactory` (없으면 자동 생성 — 어드민 1인 2역 지원)
- **DB**: 스키마 + RLS + realtime publication + checkin-photos Storage 버킷
- **UI**: 캘린더·일감 상세·체크인 화면·정산(+청구서 PDF)·공장 발주 화면 전부 구현됨

### 갭 (베타 전 필수)
1. **체크인이 인메모리** — `services/checkin.ts`가 배열 저장. 앱 재시작 시 증발. 사진 업로드 없음
2. **기사 직접입력 없음** — 일감은 공장 발주로만 생성 가능 (결정사항 B와 충돌)
3. **오프라인 큐 없음** — 현장 인터넷 불안정 대비 필요
4. **푸시 없음** — 도어링 대행 발주(C) 시 기사가 알 방법이 없음
5. **프로필 빈약** — 직군/지역 표시·수정 없음
6. **베타 빌드 없음** — dev build뿐. Metro 없이 도는 standalone APK + EAS env 필요

---

## 2. 베타 스프린트 계획

### 스프린트 A — 기사 직접입력 (제품 구조 전환) ⭐ 최우선
- **Migration 005**:
  - `jobs.factory_id` nullable 로 변경 (직접입력 건은 공장 row 없이 factory_name 텍스트만)
  - `jobs.source` 컬럼 추가 (`'factory' | 'driver'`) — 흐름 분기 기준
  - RLS: 기사 본인 일감 insert 정책 추가 (`driver_id = auth.uid()`)
- **일감 추가 화면** (기사용): 날짜·공장명(이전 입력 자동완성)·공정(단가 자동)·금액 수정·주소(선택)
  - 캘린더에 "+ 일감 추가" 진입점
  - 직접입력 건은 `confirmed` 상태로 시작 (수락/확정 단계 불필요)
- **일감 상세 분기**: source='driver' 건은 수락/거절 UI 숨김 → 체크인/완료/수금만
- **정산 그룹핑 보완**: factory_id 없는 건은 factory_name 기준으로 그룹

### 스프린트 B — 체크인 실연결 + 오프라인 큐
- `checkin.ts` 재작성: `check_records` insert + 사진 Storage 업로드(`checkin-photos/{uid}/...`)
- 실패 허용: GPS/사진 실패 시에도 체크인 저장, 누락 뱃지 표시
- 오프라인 큐: AsyncStorage 보관 → NetInfo 복구 감지 시 자동 동기화. 체크인은 절대 유실 금지
- jobs 상태 전이(checked_in/completed)와 트랜잭션적 일관성 유지

### 스프린트 C — 푸시 알림 (대행 발주 지원)
- Expo push token 등록 → `users.push_token`
- 발주 생성/공장 확정 시 대상 기사에게 발송 (Supabase Edge Function + DB webhook)
- 범위: 신규 발주·확정 2종만. 그 외 알림은 베타 이후

### 스프린트 D — 프로필 보강 + 베타 빌드/배포
- 프로필: 직군·지역 표시/수정 (등급은 표시만)
- EAS `preview` 프로필 APK (EAS env vars에 EXPO_PUBLIC_SUPABASE_* 등록 필수 — .env는 빌드에 안 들어감)
- expo-updates 채널 연결 확인 → 이후 JS 수정은 `eas update`로 OTA 배포
- Android 권한 문구(위치/카메라) 점검, 아이콘/스플래시 확인

> 스프린트 A+B 완료 시점 = 기사 1명에게 줘도 되는 최소선. C+D까지가 베타 모집선.

---

## 3. 데이터 모델 메모 (베타 반영분)

```
jobs:
  factory_id   uuid NULL     ← 005에서 nullable (직접입력 건)
  factory_name text NOT NULL  (그룹핑/표시 키 — 직접입력 건의 1차 식별자)
  source       text NOT NULL default 'factory'  ('factory'|'driver')
  status: 직접입력 건은 confirmed 에서 시작
          requested→accepted→confirmed 는 공장 발주(source='factory') 전용
```

- 어드민 대행 발주(C)는 기존 공장 흐름 그대로 (어드민의 factory row 사용)
- 팀장-팀원, 별점, 추천, 결제 자동화: 전부 베타 2차 이후

---

## 4. 리스크 & 주의

- **체크인 유실 금지**: 로컬 우선 저장 → 동기화. 실패해도 사용자에겐 성공으로
- **단가 0원 직군**(cleaning/faucet/delivery): 직접입력 화면에서 금액 수정 유도
- **EAS env**: standalone APK는 .env를 읽지 않음 — EAS 대시보드 env 등록 필수
- **카카오 키해시**: 베타 APK도 동일 EAS keystore면 추가 등록 불필요. keystore 바꾸면 재등록
- **WSL2 개발 환경**: node는 nvm v24 절대경로 사용 (시스템 node 18과 혼동 주의)

---

*코드 변경 시 1장(현재 상태)과 2장(스프린트)을 함께 갱신할 것.*
