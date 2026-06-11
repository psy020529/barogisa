# 바로기사(Barogisa) — 베타 개발 기획서

> **문서 목적**: 실사용 베타(기사 모집) 마일스톤 기준의 개발 기획. repo 루트의 기준 문서.
> **작성일**: 2026-06-11 · **기준**: main 최신 코드 직접 확인 (이전 Firebase 기준 기획서를 전면 대체)

---

## 0. 확정된 제품 결정 (2026-06-11 기획 회의)

| 쟁점 | 결정 |
|---|---|
| 일감 공급 구조 | **원래 기획 유지**: 공장(또는 도어링 대행)이 일감 등록. 지명 발주는 해당 기사에게 푸시, **공개 일감은 조건 맞는 기사에게 추천 푸시 + 기사가 앱에서 탐색·지원**. 기사 직접입력안은 폐기 |
| 팀장-팀원 기능 | 베타 2차로 연기 |
| 체크인 정책 | GPS·사진 자동 시도하되 **실패해도 체크인 성공** + 누락 표시. 오프라인 로컬 저장 → 자동 업로드 |
| 배포 채널 | **APK 직접 배포** + expo-updates OTA로 JS 자동 업데이트 |
| 베타 성공 기준 | 실기사 N명이 1주간 종이 없이 일감수락→체크인→자동정산→미수금 가시화 완주 |

**전체 플로우 (확정)**:
```
[공장/도어링 대행] 일감 등록 ── 지명 발주 ──→ 해당 기사에게 푸시 → 수락/거절
                  └─ 공개 모집 ──→ 조건(직군) 맞는 기사에게 추천 푸시
                                   + 기사가 "일감 찾기"에서 탐색 → 지원
                                   → 공장이 지원자 중 선택
   ↓ (양쪽 모두) 공장 최종 확정 = confirmed
[기사] GPS 체크인+사진 → 체크아웃+사진 → completed
[앱] 월말 공장별 합산 → 청구서 PDF → 공장 송금 → 수금 확인 = paid
```
베타에서 공장측 등록은 도어링 어드민 대행으로 시작 가능(이미 구현된 공장 화면 사용),
실공장 온보딩은 기사 풀이 생긴 후.

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
1. **공개 일감 풀 없음** — 현재는 지명 발주만 가능 (`jobs.driver_id` 필수). 공개 모집,
   기사 탐색("일감 찾기") 화면, 지원 흐름(job_applications)이 전부 미구현
2. **체크인이 인메모리** — `services/checkin.ts`가 배열 저장. 앱 재시작 시 증발. 사진 업로드 없음
3. **오프라인 큐 없음** — 현장 인터넷 불안정 대비 필요
4. **푸시 없음** — 지명 발주 알림도, 공개 일감 추천 알림도 없음. 기사가 앱을 열어야만 안다
5. **프로필 빈약** — 직군 수정/지역 없음 (추천 매칭 조건으로 필요)
6. **베타 빌드 없음** — dev build뿐. Metro 없이 도는 standalone APK + EAS env 필요

---

## 2. 베타 스프린트 계획

### 스프린트 A — 공개 일감 풀 + 지원 흐름 ⭐ 최우선
- **Migration 005**:
  - `jobs.driver_id` nullable 로 변경 (공개 모집 건은 기사 미정)
  - `jobs.listing_type` 컬럼 (`'direct'`=지명 | `'open'`=공개 모집)
  - `job_applications` 테이블 (job_id, driver_id, status pending/selected/rejected, created_at)
  - RLS: 공개 건(driver_id is null)은 인증 기사 전체 read / 지원은 본인만 insert /
    공장은 본인 일감의 지원자 read·선택
- **공장 발주 화면 확장**: "기사 지명" vs "공개 모집" 선택. 공개 건은 지원자 목록 → 선택 → 확정
- **기사 "일감 찾기" 화면** (신규 탭): 공개 일감 리스트(날짜·공정·지역·단가) → 상세 → 한 탭 지원
  - 지원 시 같은 날 본인 일정 충돌 경고 (기존 로직 재사용)
- **선택/확정 처리**: 공장이 지원자 선택 → 해당 기사 confirmed + 나머지 지원자 자동 거절
- **캘린더 연동**: 지명 신규(빨강) 유지, 내 지원중 건 표시(주황 계열)

### 스프린트 A' — 추천 매칭 조건 (A에 포함, 가볍게)
- 프로필에 직군 수정 UI (driver_job_type 이미 존재) — 추천 푸시의 매칭 키
- 지역 필드는 베타 2차 (1차 추천은 직군 매칭만)

### 스프린트 B — 체크인 실연결 + 오프라인 큐
- `checkin.ts` 재작성: `check_records` insert + 사진 Storage 업로드(`checkin-photos/{uid}/...`)
- 실패 허용: GPS/사진 실패 시에도 체크인 저장, 누락 뱃지 표시
- 오프라인 큐: AsyncStorage 보관 → NetInfo 복구 감지 시 자동 동기화. 체크인은 절대 유실 금지
- jobs 상태 전이(checked_in/completed)와 트랜잭션적 일관성 유지

### 스프린트 C — 푸시 알림 (추천의 핵심)
- Expo push token 등록 → `users.push_token`
- Supabase Edge Function + DB webhook 으로 발송:
  1. **지명 발주** → 지명된 기사에게
  2. **공개 일감 등록** → 직군 일치하는 기사 전원에게 추천 푸시 ("○일 ○○지역 시공 35만")
  3. **지원 선택(확정)** → 선택된 기사에게 (+탈락자에게도 간단히)
- 그 외 알림은 베타 이후

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
  driver_id    uuid NULL              ← 005에서 nullable (공개 모집 건은 기사 미정)
  listing_type text NOT NULL default 'direct'   ('direct'=지명 | 'open'=공개)
  status 흐름:
    direct: requested → accepted → confirmed → checked_in → completed → paid
    open:   requested(모집중) → [지원/선택] → confirmed → ... (accepted 단계 없음)

job_applications:                     ← 005 신규
  id uuid pk, job_id fk, driver_id fk,
  status text ('pending'|'selected'|'rejected'), created_at
  unique (job_id, driver_id)
  선택 시: 해당 기사 jobs.driver_id 기록 + confirmed, 나머지 지원 rejected
```

- 도어링 대행 발주는 기존 공장 흐름 그대로 (어드민의 factory row 사용)
- 추천 매칭 키: 1차는 직군(driver_job_type)만, 지역은 2차
- 팀장-팀원, 별점, 가능날짜(기사 주도 구직), 결제 자동화: 전부 베타 2차 이후

---

## 4. 리스크 & 주의

- **체크인 유실 금지**: 로컬 우선 저장 → 동기화. 실패해도 사용자에겐 성공으로
- **단가 0원 직군**(cleaning/faucet/delivery): 직접입력 화면에서 금액 수정 유도
- **EAS env**: standalone APK는 .env를 읽지 않음 — EAS 대시보드 env 등록 필수
- **카카오 키해시**: 베타 APK도 동일 EAS keystore면 추가 등록 불필요. keystore 바꾸면 재등록
- **WSL2 개발 환경**: node는 nvm v24 절대경로 사용 (시스템 node 18과 혼동 주의)

---

*코드 변경 시 1장(현재 상태)과 2장(스프린트)을 함께 갱신할 것.*
