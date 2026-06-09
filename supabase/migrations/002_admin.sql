-- 관리자 권한 추가
-- 본인 계정에 적용 방법:
--   1) 이 마이그레이션 전체를 Supabase SQL Editor에서 실행
--   2) 본인 + 대표님 user id를 확인:
--      SELECT id, name FROM users;
--   3) 다음을 실행 (UUID 본인 것으로 교체):
--      UPDATE users SET is_admin = true
--      WHERE id IN ('YOUR_UUID', 'CEO_UUID');

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
