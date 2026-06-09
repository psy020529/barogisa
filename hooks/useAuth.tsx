import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  // dev: Supabase 미설정 시 mock 진입용
  devSignIn: (mockUser: User) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

WebBrowser.maybeCompleteAuthSession();

// ── OAuth code 교환 유틸 (모듈 스코프) ─────────────────────────────────────────
// PKCE 인증 코드는 1회용이다. openAuthSessionAsync 결과 처리와 Linking 딥링크
// 핸들러가 같은 code로 동시에 exchangeCodeForSession을 호출하면 한쪽이 "code
// already used"로 실패한다. 아래 inflight 맵으로 code별 교환을 단 한 번만 수행해
// 이중 교환 레이스를 원천 차단한다.
const inflightExchange = new Map<string, Promise<void>>();

function exchangeCodeOnce(supabase: SupabaseClient, code: string): Promise<void> {
  let p = inflightExchange.get(code);
  if (!p) {
    p = (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // 다른 경로가 이미 같은 code로 세션을 만들었을 수 있다. 세션이 있으면 성공으로 간주.
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw error;
      }
    })();
    inflightExchange.set(code, p);
  }
  return p;
}

// 리다이렉트 URL에서 에러/코드를 견고하게 추출해 세션을 수립한다.
// (?code=... 쿼리, error/error_description 모두 처리)
async function createSessionFromUrl(supabase: SupabaseClient, url: string): Promise<void> {
  const u = new URL(url);
  const err = u.searchParams.get('error') ?? u.searchParams.get('error_code');
  if (err) {
    const desc = u.searchParams.get('error_description') ?? '';
    throw new Error(`OAuth 오류: ${err} ${desc}`.trim());
  }
  const code = u.searchParams.get('code');
  if (!code) return; // 코드 없음 = 우리가 처리할 리다이렉트가 아님
  await exchangeCodeOnce(supabase, code);
}

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

    // OAuth 리다이렉트를 deep link로도 받아 처리 (WebBrowser가 못 잡는 경우 대비).
    // 앱이 죽은 상태에서 브라우저가 barogisa:// 로 앱을 다시 띄우는 cold start 경로를 커버한다.
    // exchangeCodeOnce 로 openAuthSessionAsync 경로와의 이중 교환을 방지한다.
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[KAKAO OAUTH] deep link received:', event.url);
      try {
        await createSessionFromUrl(supabase, event.url);
      } catch (e) {
        console.error('[KAKAO OAUTH] deep link session error:', e);
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    // 앱이 deep link로 cold start된 경우도 처리
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
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

  async function sendEmailOtp(email: string) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async function verifyEmailOtp(email: string, token: string) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }

  async function signInWithKakao() {
    const supabase = getSupabase();
    // makeRedirectUri는 환경(dev build / Expo Go)에 맞춰 올바른 형태의 URL을 만든다.
    // dev build/standalone: barogisa://auth/callback  (Kakao OAuth는 dev build에서 테스트할 것)
    // Linking.createURL('/path')의 barogisa:///path(트리플 슬래시) 문제를 피하려 makeRedirectUri 사용.
    const redirectTo = makeRedirectUri({ scheme: 'barogisa', path: 'auth/callback' });
    console.log('[KAKAO OAUTH] redirectTo =', redirectTo);
    // ⚠️ 이 redirectTo 값이 Supabase Authentication → URL Configuration → Redirect URLs
    //    허용목록에 반드시 등록돼 있어야 한다. 없으면 Supabase가 Site URL로 폴백 →
    //    앱으로 딥링크가 안 돌아와 "로그인 후 메인 화면 복귀" 증상이 발생한다.

    // Kakao 동의항목 중 "권한 있음" 인 것만 명시 (account_email/phone_number는 비즈앱·검수 필요)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo, scopes: 'profile_nickname profile_image', skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('OAuth URL이 비어있습니다');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.log('[KAKAO OAUTH] result =', JSON.stringify(result));

    if (result.type === 'success') {
      // 정상 경로: 브라우저가 redirectTo로 돌아옴 → code 추출 → 세션 교환
      await createSessionFromUrl(supabase, result.url);
      return;
    }

    // 비-success(dismiss/cancel): 두 가지 가능성
    //  1) 사용자가 직접 닫음 → 정상 (조용히 종료)
    //  2) Supabase Redirect URLs 미허용으로 앱으로 안 돌아옴 → 딥링크 핸들러가
    //     뒤늦게 처리할 수도 있으니, 잠깐 기다렸다 세션이 생겼는지 확인한다.
    console.warn('[KAKAO OAUTH] non-success type:', result.type);
    await new Promise((r) => setTimeout(r, 600));
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      console.warn(
        '[KAKAO OAUTH] 세션 없음 — Supabase Redirect URLs 허용목록에 redirectTo가 등록됐는지 확인 필요',
      );
    }
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

  return (
    <AuthContext.Provider
      value={{ status, user, authUserId, signInWithKakao, sendEmailOtp, verifyEmailOtp, completeOnboarding, devSignIn, signOut }}
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
