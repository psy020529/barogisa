import type { Session } from '@supabase/supabase-js';
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

  async function signInWithKakao() {
    const supabase = getSupabase();
    const redirectTo = Linking.createURL('/auth/callback');
    // 카카오 비즈앱 전환 없는 개인 앱은 phone_number 스코프 요청 불가 (KOE205).
    // 전화번호는 온보딩 화면에서 직접 입력받음.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('OAuth URL이 비어있습니다');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;

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
      value={{ status, user, authUserId, signInWithKakao, completeOnboarding, devSignIn, signOut }}
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
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
