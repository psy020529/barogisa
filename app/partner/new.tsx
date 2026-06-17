import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { createPartner } from '@/services/ledger';
import { PARTNER_TYPE_LABEL, type PartnerType } from '@/types';

const TYPES: PartnerType[] = ['factory', 'interior', 'dealer', 'personal'];
const TRADE_PRESETS = ['싱크대', '상부장', '붙박이장', '도어', '재단', '시공'];

export default function PartnerNew() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<PartnerType>('factory');
  const [location, setLocation] = useState('');
  const [trades, setTrades] = useState<string[]>([]);
  const [customTrade, setCustomTrade] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTrade = (t: string) =>
    setTrades((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const addCustom = () => {
    const t = customTrade.trim();
    if (t && !trades.includes(t)) setTrades((cur) => [...cur, t]);
    setCustomTrade('');
  };

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return Alert.alert('확인', '업체명을 입력하세요.');
    if (trades.length === 0) return Alert.alert('확인', '주요 공종을 1개 이상 선택하세요.');
    setBusy(true);
    try {
      const id = await createPartner(
        {
          name: name.trim(),
          type,
          location: location.trim() || undefined,
          trades,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        },
        user.id,
      );
      // 다음 — 단가 입력 (거래처 상세 = 단가표)
      router.replace(`/partner/${id}?new=1`);
    } catch (e) {
      Alert.alert('등록 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 거래처</Text>
        </Pressable>
        <Text style={styles.title}>거래처 등록</Text>

        <Field label="업체명 *">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: 한솔퍼니쳐" />
        </Field>

        <Field label="유형 *">
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Chip key={t} on={type === t} label={PARTNER_TYPE_LABEL[t]} onPress={() => setType(t)} />
            ))}
          </View>
        </Field>

        <Field label="주요 공종 * (복수 선택)">
          <View style={styles.chips}>
            {[...new Set([...TRADE_PRESETS, ...trades])].map((t) => (
              <Chip key={t} on={trades.includes(t)} label={t} onPress={() => toggleTrade(t)} />
            ))}
          </View>
          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={customTrade}
              onChangeText={setCustomTrade}
              placeholder="직접 추가"
              onSubmitEditing={addCustom}
            />
            <Pressable style={styles.addChip} onPress={addCustom}>
              <Text style={styles.addChipText}>추가</Text>
            </Pressable>
          </View>
        </Field>

        <Field label="지역 (선택)">
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="예: 위례" />
        </Field>

        <Field label="담당자 (선택)">
          <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="이름" />
        </Field>
        <Field label="연락처 (선택)">
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            placeholder="010-0000-0000"
          />
        </Field>

        <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? '저장 중...' : '다음 — 단가 입력'}</Text>
        </Pressable>
        <Text style={styles.hint}>단가는 건너뛰고 첫 기록 때 입력해도 됩니다</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm, fontWeight: FONT_WEIGHT.semibold },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: SPACING.lg },
  field: { marginBottom: SPACING.lg },
  fieldLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  chipTextOn: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  customRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  addChip: { paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  addChipText: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  submit: { marginTop: SPACING.md, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold },
  hint: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },
});
