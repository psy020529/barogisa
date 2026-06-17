import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('확인', '이름을 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      // 단일 역할(팀장). 기존 스키마 호환 위해 role은 driver로 고정.
      await completeOnboarding({ role: 'driver', name: name.trim(), phone: phone.trim() || undefined });
      router.replace('/');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: SPACING.xl, gap: SPACING.md }}>
        <Text style={styles.title}>환영합니다</Text>
        <Text style={styles.subtitle}>먼저 한 번만 알려주세요</Text>

        <Text style={styles.label}>이름 또는 상호</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예: 김팀장"
        />

        <Text style={styles.label}>연락처 (선택)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="010-0000-0000"
        />

        <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? '저장 중...' : '시작하기'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.lg },
  label: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  row: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.title, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  submit: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '700' },
});
