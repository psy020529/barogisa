import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { hasSupabaseConfig } from '@/services/supabase';
import type { User } from '@/types';

export default function Login() {
  const { signInWithKakao, sendEmailOtp, verifyEmailOtp, devSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!email.trim().includes('@')) {
      Alert.alert('확인', '올바른 이메일을 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      await sendEmailOtp(email.trim());
      setOtpSent(true);
      Alert.alert('전송 완료', `${email}로 6자리 코드를 보냈습니다.\n메일함을 확인하세요.`);
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('확인', '6자리 코드를 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), otp.trim());
      router.replace('/');
    } catch (e) {
      Alert.alert('인증 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const loginKakao = async () => {
    setBusy(true);
    try {
      await signInWithKakao();
      router.replace('/');
    } catch (e) {
      Alert.alert('카카오 로그인 실패', e instanceof Error ? e.message : String(e));
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>바로기사</Text>
        <Text style={styles.subtitle}>주방가구 시공 운영 도구</Text>

        <View style={styles.section}>
          {!otpSent ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Pressable
                style={[styles.button, styles.primary, busy && styles.disabled]}
                onPress={sendCode}
                disabled={busy}
              >
                <Text style={styles.primaryText}>{busy ? '전송 중...' : '이메일로 코드 받기'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.note}>{email}로 보낸 6자리 코드를 입력하세요</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!busy}
                autoFocus
              />
              <Pressable
                style={[styles.button, styles.primary, busy && styles.disabled]}
                onPress={verifyCode}
                disabled={busy}
              >
                <Text style={styles.primaryText}>{busy ? '확인 중...' : '확인'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
              >
                <Text style={styles.linkText}>← 이메일 다시 입력</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.button, styles.kakaoButton, busy && styles.disabled]}
          onPress={loginKakao}
          disabled={busy}
        >
          <Text style={styles.kakaoText}>카카오로 시작</Text>
        </Pressable>
        <Text style={styles.smallNote}>* 카카오 검수 통과 전까지 비활성</Text>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.xl, paddingTop: SPACING.xxl, gap: SPACING.md },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.text, marginTop: SPACING.xxl },
  subtitle: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.xl },
  section: { gap: SPACING.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.title,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  otpInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },
  button: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  primary: { backgroundColor: COLORS.primary },
  primaryText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '700' },
  linkText: { textAlign: 'center', color: COLORS.primary, paddingVertical: SPACING.sm },
  note: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xs },
  smallNote: { fontSize: FONT_SIZE.caption, color: COLORS.textLight, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  kakaoButton: { backgroundColor: '#FEE500' },
  kakaoText: { color: '#000', fontSize: FONT_SIZE.title, fontWeight: '700' },
  devBox: {
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
