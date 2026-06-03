import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '@/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  // 개발용 가짜 로그인 — Firebase Phone OTP는 인증 화면 작업 시 연결
  devSignIn: (mockUser: User) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading] = useState(false);

  const devSignIn = (mockUser: User) => setUser(mockUser);
  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, loading, devSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
