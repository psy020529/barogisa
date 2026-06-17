# 바로기사 — 세션 인수인계 (2026-06-17)

> 새 세션에서 이 파일부터 읽고 이어서 작업. 기획 원본: `plan/PIVOT-PLAN.md`, `plan/baro-gisa-dev-handoff.md`, `plan/baro-gisa-wireframe.html`.

---

## 0. 한 줄 현황
**매칭 앱 → "돈 보이는 장부 캘린더"(시공 팀장 1인용)로 전면 피벗 중.** 핵심 루프(캘린더→FAB→작업기록→캘린더 반영)까지 구현·커밋 완료. 남은 건 **정산 탭 재작성 + 정산 메시지(킬러)**.

---

## 1. 환경 / 실행 (중요 — 매번 동일)
- **실제 작업·빌드는 WSL2 `~/barogisa`**. Windows `C:\Users\psy02\도어링\dev\barogisa`는 git 동기화 사본.
- **node는 nvm v24 절대경로로 호출**: `/home/psy020529/.nvm/versions/node/v24.15.0/bin/node`
  - 비대화형 셸은 시스템 node 18을 잡아 metro가 깨짐(`toReversed` 에러). npx/eas는 `PATH=/home/psy020529/.nvm/versions/node/v24.15.0/bin:/usr/bin:/bin` 프리픽스로.
  - `wsl bash -lc`에 `$VAR`/`$(...)` 쓰면 외부 git-bash가 미리 확장해 깨짐 → **리터럴 경로 사용**. git은 `git -C <path>`.
- **타입체크**: `wsl bash -lc 'cd /home/psy020529/barogisa && /home/psy020529/.nvm/versions/node/v24.15.0/bin/node node_modules/typescript/bin/tsc --noEmit'`
- **Metro(개발) 실행** (run_in_background로):
  `wsl bash -lc 'cd /home/psy020529/barogisa && EXPO_NO_TELEMETRY=1 exec /home/psy020529/.nvm/versions/node/v24.15.0/bin/node /home/psy020529/barogisa/node_modules/.bin/expo start --tunnel --dev-client'`
  - 터널 주소는 barogisa 프로젝트 고정: `https://ven3yds-psy020529-8081.exp.direct` (ngrok API: `curl localhost:4040/api/tunnels`)
  - **다른 expo 프로젝트(barogagu 등)가 8081 점유하면 충돌** → `pkill -9 -f expo` 후 재시작.
  - 외부 도달 확인: `curl -m20 https://ven3yds-psy020529-8081.exp.direct/status` == 200
- **git push**: WSL은 GitHub 자격증명 없어 hang됨. **Windows 사본에서 push**:
  `cd /c/Users/psy02/도어링/dev/barogisa && git fetch "//wsl.localhost/Ubuntu/home/psy020529/barogisa" main && git reset --hard FETCH_HEAD && git push origin main`
- **배포 APK(standalone, 터널 불필요)**: `eas build -p android --profile preview` → OTA는 `eas update --channel preview`. EAS env(EXPO_PUBLIC_*)·FCM·카카오 keystore 모두 설정 완료.

---

## 2. 지금 할 일 (테스트 먼저)
1. **migration 009 실행** (사용자가 SQL Editor에서). 본문은 이전 메시지/`supabase/migrations/009_ledger.sql`. 안 하면 새 테이블 없어 캘린더/기록이 에러.
   - SQL Editor: https://supabase.com/dashboard/project/ugflgojbcmantrrgroao/sql/new
2. Metro 띄우고 폰 dev build에서 접속 → 루프 확인:
   거래처 등록(+단가) → 캘린더 FAB → 작업기록(거래처·팀원·일수→금액 자동) → 저장 → 캘린더 셀에 금액·당일 작업행 반영 → 작업 탭하여 입금완료/삭제
   - **규칙: 마이그레이션은 SQL 본문을 항상 채팅에 함께 제공** (사용자 선호, 전 프로젝트 공통)

---

## 3. 구현 완료 (커밋됨, HEAD 67323b4 이후 ~5커밋)
- **migration 009** `supabase/migrations/009_ledger.sql`: partners·rate_tables·members·work_logs·user_settings + owner RLS + work-photos 버킷 + realtime(work_logs,partners)
- **타입** `types/ledger.ts` (Partner/RateItem/Member/WorkLog/UserSettings + PARTNER_TYPE_LABEL·WORK_TYPE_LABEL), `types/index.ts`에 export
- **서비스** `services/ledger.ts`: listPartners/createPartner/saveRates, listMembers/createMember/deleteMember, listWorkLogsByMonth/listUnpaidWorkLogs/createWorkLog/getWorkLog/updateWorkLogPayment/deleteWorkLog, getUserSettings/saveUserSettings, subscribe* (유니크 채널)
- **훅** `hooks/useLedger.ts`: usePartners/useMembers/useWorkLogs(month 'YYYY-MM')
- **내비** `app/(tabs)/_layout.tsx`: 4탭(calendar·partners·settlement·rates), find·profile는 `href:null`로 숨김(Phase2 보존)
- **캘린더** `app/(tabs)/calendar.tsx`: 수익/미수금 StatCard, 날짜셀 그날합산금액+입금dot(미수=노랑/완료=초록), 당일 작업행, +FAB→/work/new, 헤더 설정아이콘→/(tabs)/profile, 14일경과 경고
- **거래처** `app/(tabs)/partners.tsx`(목록), `app/partner/new.tsx`(등록), `app/partner/[id].tsx`(단가표 편집)
- **단가표 탭** `app/(tabs)/rates.tsx`(거래처→단가 편집 진입)
- **작업** `app/work/new.tsx`(기록추가: 거래처→단가 자동, 공종선택, 작업유형, 날짜픽커, 팀원멀티+인라인추가, 일수, 금액 자동계산+수기보정, 메모), `app/work/[id].tsx`(상세·입금토글·삭제)
- **온보딩/index**: 역할 선택 제거, 팀장 단일(role=driver 고정), 모두 캘린더로

## 4. 남은 일 (TaskList #17 진행중)
- **정산 탭 재작성** `app/(tabs)/settlement.tsx` — 지금은 **옛 일감(jobs) 기반**. work_logs로 교체: 월 선택, 총정산/미수 요약(StatCard), 거래처별/팀원별 토글, 입금 수동체크(updateWorkLogPayment), 미수 N일 배지
- **정산 메시지(킬러)** — 거래처(또는 전체)+월 기록을 카톡 텍스트 생성 + 복사(React Native Clipboard/Share). 포맷 골격은 handoff §4-3. **실제 팀장 카톡 샘플 확보 후 정교화**(PM 결정4, 아직 샘플 없음)
- 작업 **사진 첨부**(work-photos 업로드 — checkin.ts 패턴 재사용), **설정 화면**(팀원 관리·입금계좌 = user_settings), 거래처 시드

## 5. PM 결정(확정) — handoff §6
1 단가=첫 기록때 유도(건너뛰기 허용) / 2 팀원 비가입 라이트 / 3 입금 수동체크 / 4 정산메시지 포맷=샘플 대기 / 5 시드=선택. 전부 "기본값으로" 확정(2026-06-17).

## 6. Phase 2 보존 (삭제 금지)
매칭 관련: `app/(tabs)/find.tsx`, `app/factory/*`, `app/job/*`, jobs·job_applications 마이그레이션(001~008), 카카오 로그인/푸시 파이프 — 전부 **유지**. 탭/index에서만 숨김. 나중 매칭 단계 재사용.

## 7. 재사용 자산
StatCard, DaumPostcode(`components/`), 디자인 토큰(`constants/` colors·layout·labels, docs/DESIGN.md), 네이버 주소(`services/naver.ts`), 카카오 로그인(`hooks/useAuth`), 푸시(`services/push.ts`, FCM 검증 완료) — 그대로 사용.
