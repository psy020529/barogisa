import type { Session } from '@supabase/supabase-js';
import { login as kakaoLogin, unlink as kakaoUnlink } from '@react-native-kakao/user';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/services/supabase';
import type { DriverJobType, DriverTier, User, UserRole } from '@/types';

type Status = 'loading' | 'unauthenticated' | 'needs-onboarding' | 'authenticated';

type OnboardingInput = { role: UserRole; name: string; phone?: string };

type AuthContextValue = {
  status: Status;
  user: User | null;
  authUserId: string | null;
  signInWithKakao: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  // dev: Supabase 미설정 시 mock 진입용
  devSignIn: (mockUser: User) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(hasSupabaseConfig ? 'loading' : 'unauthenticated');
  const [user, setUser] = useState<User | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => handleSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSession(session: Session | null) {
    if (!session) {
      setUser(null);
      setAuthUserId(null);
      setStatus('unauthenticated');
      return;
    }
    setAuthUserId(session.user.id);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) {
      console.error('profile load error', error);
      setStatus('unauthenticated');
      return;
    }
    if (!data) {
      setStatus('needs-onboarding');
      return;
    }
    setUser(rowToUser(data));
    setStatus('authenticated');
  }

  // ── 카카오 네이티브 로그인 ──────────────────────────────────────────────────
  // 웹 OAuth(인앱 브라우저 → barogisa:// 리다이렉트) 방식은 안드로이드에서
  // "카카오톡으로 로그인" 앱 점프 시 브라우저 복귀가 깨져 dismiss → 메인 복귀가
  // 빈번했다. 또 Supabase 웹 OAuth는 account_email scope를 강제해 검수 벽이 있었다.
  // → 카카오 네이티브 SDK로 OIDC id_token을 직접 받아 Supabase에 넘긴다.
  //   리다이렉트가 없으므로 복귀 실패가 원천적으로 사라지고, OIDC라 이메일 검수도 회피된다.
  //   ⚠️ 전제: Kakao 콘솔에서 OpenID Connect(OIDC) 활성화 + Android 플랫폼(패키지명·키해시) 등록.
  async function signInWithKakao() {
    const supabase = getSupabase();
    const token = await kakaoLogin();
    if (!token.idToken) {
      throw new Error(
        'Kakao idToken이 없습니다. Kakao 콘솔 → 카카오 로그인 → 고급에서 OpenID Connect(OIDC)를 활성화하세요.',
      );
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'kakao',
      token: token.idToken,
    });
    if (error) throw error;
    // status 갱신(프로필 조회 포함)까지 여기서 직접 기다린다. onAuthStateChange에만
    // 맡기면 호출측이 router.replace('/') 하는 시점에 status가 아직 unauthenticated라
    // index가 로그인 화면으로 되돌리는 race가 생긴다 (카카오 버튼 두 번 눌러야 하는 증상).
    await handleSession(data.session);
  }

  async function completeOnboarding(input: OnboardingInput) {
    if (!authUserId) throw new Error('인증된 사용자가 없습니다');
    const supabase = getSupabase();
    const row = {
      id: authUserId,
      role: input.role,
      name: input.name,
      phone: input.phone ?? null,
      driver_job_type: input.role === 'driver' ? 'installation' : null,
      driver_tier: input.role === 'driver' ? 'standard' : null,
    };
    const { data, error } = await supabase.from('users').insert(row).select().single();
    if (error) throw error;
    setUser(rowToUser(data));
    setStatus('authenticated');
  }

  function devSignIn(mockUser: User) {
    setUser(mockUser);
    setStatus('authenticated');
  }

  async function signOut() {
    if (hasSupabaseConfig) {
      try {
        await getSupabase().auth.signOut();
      } catch (e) {
        console.warn('signOut error', e);
      }
    }
    setUser(null);
    setAuthUserId(null);
    setStatus('unauthenticated');
  }

  // 회원 탈퇴: 서버측 계정 삭제(RPC) → 카카오 연결 끊기 → 로컬 세션 정리.
  // delete_my_account 는 SECURITY DEFINER 함수로 auth.users + public.users 를 삭제한다
  // (supabase/migrations/003_delete_account.sql). 카카오 unlink까지 해야 다음
  // 로그인에서 동의 화면부터 다시 시작돼 회원가입 플로우를 재테스트할 수 있다.
  async function deleteAccount() {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    try {
      await kakaoUnlink();
    } catch (e) {
      // 카카오 미연동 계정이거나 토큰 만료 — 계정 삭제 자체는 성공했으므로 무시
      console.warn('kakao unlink skip:', e);
    }
    await signOut();
  }

  return (
    <AuthContext.Provider
      value={{ status, user, authUserId, signInWithKakao, completeOnboarding, devSignIn, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

type UserRow = {
  id: string;
  role: UserRole;
  name: string;
  phone: string | null;
  driver_job_type: string | null;
  driver_tier: string | null;
  factory_id: string | null;
  push_token: string | null;
  is_admin: boolean | null;
  created_at: string | null;
};

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone ?? '',
    driverProfile:
      row.role === 'driver'
        ? {
            jobType: (row.driver_job_type as DriverJobType) ?? 'installation',
            tier: (row.driver_tier as DriverTier) ?? undefined,
          }
        : undefined,
    factoryProfile: row.role === 'factory' ? { factoryId: row.factory_id ?? row.id } : undefined,
    pushToken: row.push_token ?? undefined,
    isAdmin: row.is_admin ?? false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
