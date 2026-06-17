# 바로기사 피벗 기획 — 기록·정산 장부 (캘린더 중심)

> 결정(2026-06-17): **전면 전환**. plan(`baro-gisa-dev-handoff.md` + `baro-gisa-wireframe.html`)을
> 새 MVP로 삼는다. 양면 매칭(공장↔기사)·공개일감·지원·공장계정·카카오 다중역할은
> **Phase 2로 보존**(코드/마이그레이션 유지, 내비·라우팅에서 숨김. 삭제 X).
> 1차 사용자 = **시공 팀장 단일 역할**. 제품 = "돈이 보이는 장부 캘린더".

---

## 0. 핵심 루프 (제품의 전부)
```
캘린더 → +FAB → 작업 기록 추가(거래처·팀원·일수 → 금액 자동계산) → 저장 → 캘린더에 금액 즉시 반영
```
킬러 기능 = **정산 메시지 자동 생성**(팀장 카톡 양식 그대로 → 복사).

---

## 1. 정보구조 / 내비게이션
- **하단 탭 4개**: 캘린더 · 거래처 · 정산 · 단가표
- **설정**(앱바 우상단 ◇ 아이콘): 팀원 관리 · 입금계좌 · 로그아웃/탈퇴
  - 현재 `(tabs)/내정보`는 탭에서 내리고 설정 화면으로 전환(또는 ◇ 진입)
- **+FAB**: 캘린더 화면에서만. 작업 기록 추가로 진입
- 로그인은 **카카오 유지**(이미 동작). 온보딩은 역할 선택 제거 → **이름(+연락처)만**. 모든 사용자 = 팀장(owner)

---

## 2. 데이터 모델 (신규 — Supabase, migration 009 예정)
모든 테이블 `owner_id = auth.uid()` 기준 RLS (팀장 본인 데이터만).

```
partners (거래처)
  id uuid pk, owner_id uuid, name text*, type text(factory|interior|dealer|personal)*,
  location text?, trades text[]*, contact_name text?, contact_phone text?, created_at

rate_tables (거래처별 단가)
  id uuid pk, partner_id uuid->partners, trade text, daily_rate int
  unique(partner_id, trade)

members (팀원, 비가입)
  id uuid pk, owner_id uuid, name text*, phone text?

work_logs (작업 기록) ★ 중심
  id uuid pk, owner_id uuid, partner_id uuid->partners, date date*,
  work_type text(install|measure|cut|as) default install,
  member_ids uuid[]*  (>=1), days int default 1,
  unit_rate int,                 -- 기록 시점 단가 스냅샷
  amount int,                    -- = unit_rate * len(member_ids) * days
  is_manual bool default false,  -- 금액 수기 보정
  photos text[]?, memo text?,
  payment text(unpaid|paid) default unpaid, paid_at timestamptz?, created_at

user_settings (정산 메시지용)
  owner_id uuid pk, bank_account text?, account_holder text?
```
- 금액은 **스냅샷**(unit_rate) 저장 → 단가표 바꿔도 과거 기록 불변.
- 정산은 work_logs 집계로 도출(별도 정산 테이블 불필요).
- 사진은 기존 `checkin-photos` 버킷 재사용 or `work-photos` 신설.

---

## 3. 캘린더 화면 (★ 이번 고도화 초점)
와이어프레임 S1 기준.

**상단 요약(항상 노출)** — 2칸 StatCard 재사용
- 이번 달 수익 = Σ(이번달 work_logs.amount)  → success 톤
- 미수금 = Σ(payment=unpaid amount) + "N곳 · 14일 경과 알림" 메타 → danger 톤

**월/주 토글** (월 기본). 1차는 월만, 주는 후속 가능.

**달력 셀** (현 커스텀 dayComponent 확장):
- 작업 있는 날 → 셀 하단에 **그날 합산 금액**(축약: ₩1.18M), 우상단 dot
- 미수 있는 날 → dot을 경고색(due/주황)
- 오늘 강조·주말 색은 현행 유지

**날짜 탭 → 당일 작업 시트**(하단):
- 행 = 거래처 · 작업유형 / 팀원수 · 메모 · 사진수 / 금액 · 입금배지(입금완료/미수 N일)
- 행 탭 → 작업 상세(보기/수정/입금처리/삭제)

**+FAB** → 작업 기록 추가. 빈 달 → "기록을 추가하면 여기에 수익이 쌓입니다."

> 현재 캘린더의 일감 4색·공개일감 탐색·배너는 제거(Phase 2로). 데이터 소스를
> `useDriverJobs/useOpenJobs` → `useWorkLogs(month)` 로 교체.

---

## 4. 작업 기록 추가 (캘린더의 짝, 핵심)
- 필드: 거래처(필수 select) · 날짜(today 기본) · 작업유형(시공/실측/재단/AS, 시공 기본) ·
  투입 팀원(필수 multi-chip) · 일수(1 기본) · 사진(선택 다중) · 메모(선택)
- **거래처 선택 → 단가 자동 로드 → 금액 = 단가×인원×일수 실시간**(파란 박스)
- 금액 **수기 보정 허용**(is_manual=true). 단가 미설정 거래처면 단가 입력 인라인 유도
- 저장 후 캘린더 해당 날짜 복귀 + 즉시 반영

---

## 5. 거래처 / 단가표
- 거래처 목록: 검색(업체명·지역·공종), 카드(업체명·유형배지·위치·공종·단가요약), 최근사용순
- 거래처 등록: 업체명·유형·공종 필수 / 위치·연락처 선택 / **단가 건너뛰기 허용**
- 단가표 편집: 거래처별 `공종 → 일당` 행 추가/삭제, 저장 즉시 반영(과거 불변)

---

## 6. 정산 + 정산 메시지(킬러)
- 정산 내역: 월 선택 · 총정산액/미수금 요약 · **거래처별/팀원별 토글**
  - 거래처별 = 받을 돈·입금상태, 팀원별 = 줄 돈·투입일수
  - 미수 `N일` 배지, **N≥14 → 알림 트리거**(푸시는 검증 완료된 파이프 재사용)
  - 입금확인 = **수동 체크**(MVP)
- 정산 메시지 모달: 거래처(또는 전체)+월 기록을 카톡 텍스트로 자동 생성 → [복사]
  - ⚠️ **포맷은 실제 팀장 카톡 샘플 필요(PM 결정 4 = 차단 이슈)**. 샘플 받기 전까진 handoff §4-3 골격 사용

---

## 7. 매칭 코드 보존 방식 (Phase 2)
- 삭제 X. 다음만 수행:
  - `(tabs)/_layout`에서 일감찾기 탭 제거, `(tabs)/find.tsx`·`factory/*`·지원 흐름은 파일 유지(라우트 비노출)
  - `app/index.tsx` 역할 분기 단순화(팀장 단일)
  - jobs·job_applications 마이그레이션/스키마는 DB에 그대로 둠
  - 카카오 로그인·signInWithIdToken·푸시 파이프는 **그대로 재사용**
- 기록을 위해 `docs/`에 "Phase 2 보류 기능" 메모

---

## 8. 스프린트 순서 (제안)
1. **데이터 모델 + 내비 피벗** — migration 009(4테이블+RLS), 탭 4개 재구성, 매칭 숨김, 온보딩 단순화
2. **캘린더(돈 보이는 장부)** — 요약·금액 셀·당일 시트 (work_logs 연동) ★초점
3. **작업 기록 추가** — 자동계산·수기보정·사진 (캘린더 루프 완성)
4. **거래처 + 단가표** — 등록·검색·단가 스냅샷
5. **정산 + 정산 메시지** — 집계·입금체크·카톡 생성(샘플 확보 후 포맷 확정)·14일 알림(푸시)
6. 설정(팀원·계좌)·시드·다듬기

> 1~3 완료 = 팀장이 "기록→캘린더에 돈 쌓임"을 체험하는 최소선. 4~5가 정산 가치 완성.

---

## 9. PM 결정 (handoff §6) — 기본값 제안
1. 단가 입력 시점 → **첫 기록 때 유도**(등록 시 건너뛰기 허용) ✅권장
2. 팀원 비가입 라이트 → **확정**(이름만, 팀장이 등록)
3. 입금확인 수동 체크 → **확정**
4. 정산 메시지 포맷 → **실제 카톡 샘플 필요** (5단계 전까지 확보)
5. 거래처 시드 → 보유 공장 N곳 사전 입력 여부 (선택)
