import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

// MVP 초기: 실제 Firebase Phone OTP 연결 전까지 사용하는 개발용 로그인.
// Firebase 프로젝트 연결 후 phone OTP 화면으로 교체 예정.
export default function Login() {
  const { devSignIn } = useAuth();

  const enterAs = (role: 'driver' | 'factory') => {
    const mockUser: User = {
      id: role === 'driver' ? 'dev-driver-1' : 'dev-factory-1',
      role,
      name: role === 'driver' ? '테스트 기사' : '테스트 공장',
      phone: '010-0000-0000',
      driverProfile: role === 'driver' ? { jobType: 'installation', tier: 'standard' } : undefined,
      factoryProfile: role === 'factory' ? { factoryId: 'dev-factory-1' } : undefined,
      createdAt: Date.now(),
    };
    devSignIn(mockUser);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>바로기사</Text>
      <Text style={styles.subtitle}>개발 모드 — 역할을 선택해 진입하세요</Text>

      <Pressable style={[styles.button, { backgroundColor: COLORS.primary }]} onPress={() => enterAs('driver')}>
        <Text style={styles.buttonText}>기사로 시작</Text>
      </Pressable>

      <Pressable style={[styles.button, { backgroundColor: COLORS.success }]} onPress={() => enterAs('factory')}>
        <Text style={styles.buttonText}>공장으로 시작</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  button: {
    width: '100%',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZE.title,
    fontWeight: '600',
  },
});
