import type { Session } from '@supabase/supabase-js';
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
    // 표준 Supabase RN 패턴: OS가 barogisa:// scheme으로 앱을 열면 여기서 code 추출 → 세션 교환.
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[KAKAO OAUTH] deep link received:', event.url);
      try {
        const urlObj = new URL(event.url);
        const code = urlObj.searchParams.get('code');
        if (!code) return;
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) console.error('[KAKAO OAUTH] code exchange error:', exErr);
        else console.log('[KAKAO OAUTH] session established via deep link');
      } catch (e) {
        console.error('[KAKAO OAUTH] deep link parse error:', e);
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
    // Linking.createURL('/path')는 path가 슬래시로 시작하면 호스트가 비는 형태(barogisa:///path)로
    // 만들어버려 OS·브라우저·Supabase가 모두 매칭 실패. 그래서 makeRedirectUri 사용.
    const redirectTo = makeRedirectUri({ scheme: 'barogisa', path: 'auth/callback' });
    console.log('[KAKAO OAUTH] redirectTo =', redirectTo);
    // Kakao 동의항목 중 "권한 있음" 인 것만 명시 (account_email/phone_number는 비즈앱·검수 필요)
    // 빈 문자열을 전달하면 Supabase가 기본 scope를 추가하니 명시적으로 사용 가능한 것만 적음.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo, scopes: 'profile_nickname profile_image', skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('OAuth URL이 비어있습니다');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.log('[KAKAO OAUTH] result =', JSON.stringify(result));
    if (result.type !== 'success') {
      console.warn('[KAKAO OAUTH] non-success type:', result.type, '— Supabase Redirect URLs 미매칭 가능성');
      return;
    }

    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('인증 코드가 없습니다');
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
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
