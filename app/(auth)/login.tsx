import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { hasSupabaseConfig } from '@/services/supabase';
import type { User } from '@/types';

export default function Login() {
  const { signInWithKakao, devSignIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const loginKakao = async () => {
    setBusy(true);
    try {
      await signInWithKakao();
      router.replace('/');
    } catch (e) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const enterAsDev = (role: 'driver' | 'factory') => {
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
      <Text style={styles.subtitle}>주방가구 시공 운영 도구</Text>

      <Pressable
        style={[styles.button, styles.kakaoButton, busy && { opacity: 0.6 }]}
        onPress={loginKakao}
        disabled={busy}
      >
        <Text style={styles.kakaoText}>{busy ? '로그인 중...' : '카카오로 시작'}</Text>
      </Pressable>

      {!hasSupabaseConfig && (
        <View style={styles.devBox}>
          <Text style={styles.devLabel}>개발 모드 (Supabase 미설정)</Text>
          <View style={styles.devRow}>
            <Pressable
              style={[styles.devButton, { backgroundColor: COLORS.primary }]}
              onPress={() => enterAsDev('driver')}
            >
              <Text style={styles.devButtonText}>기사로 시작</Text>
            </Pressable>
            <Pressable
              style={[styles.devButton, { backgroundColor: COLORS.success }]}
              onPress={() => enterAsDev('factory')}
            >
              <Text style={styles.devButtonText}>공장으로 시작</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.xxl },
  button: {
    width: '100%',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  kakaoButton: { backgroundColor: '#FEE500' },
  kakaoText: { color: '#000000', fontSize: FONT_SIZE.title, fontWeight: '700' },
  devBox: {
    width: '100%',
    marginTop: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  devLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.sm, textAlign: 'center' },
  devRow: { flexDirection: 'row', gap: SPACING.sm },
  devButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  devButtonText: { color: '#fff', fontWeight: '600' },
});
