import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { usePartners } from '@/hooks/useLedger';
import { saveRates } from '@/services/ledger';

type Row = { trade: string; rate: string };

export default function PartnerDetail() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const partners = usePartners();
  const partner = partners.find((p) => p.id === id);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  // 단가 행 초기화: 기존 단가 우선, 없으면 거래처 공종으로 빈 행 생성 (1회)
  useEffect(() => {
    if (!partner || rows !== null) return;
    if (partner.rates && partner.rates.length > 0) {
      setRows(partner.rates.map((r) => ({ trade: r.trade, rate: String(r.dailyRate) })));
    } else {
      setRows(partner.trades.map((t) => ({ trade: t, rate: '' })));
    }
  }, [partner, rows]);

  const update = (i: number, key: keyof Row, v: string) =>
    setRows((cur) => cur!.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  const addRow = () => setRows((cur) => [...(cur ?? []), { trade: '', rate: '' }]);
  const removeRow = (i: number) => setRows((cur) => cur!.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!partner || !rows) return;
    setBusy(true);
    try {
      await saveRates(
        partner.id,
        rows
          .filter((r) => r.trade.trim())
          .map((r) => ({ trade: r.trade.trim(), dailyRate: Number(r.rate.replace(/[^0-9]/g, '')) || 0 })),
      );
      router.replace(isNew ? '/(tabs)/partners' : '/(tabs)/rates');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!partner) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>거래처를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 거래처</Text>
        </Pressable>
        <Text style={styles.title}>{partner.name} · 단가표</Text>
        <Text style={styles.desc}>여기서 정한 단가가 작업 기록 시 자동으로 불러와집니다.</Text>

        {(rows ?? []).map((r, i) => (
          <View key={i} style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={r.trade}
              onChangeText={(v) => update(i, 'trade', v)}
              placeholder="공종 (예: 싱크대 시공)"
            />
            <TextInput
              style={[styles.input, styles.rateInput]}
              value={r.rate}
              onChangeText={(v) => update(i, 'rate', v)}
              keyboardType="numeric"
              placeholder="일당"
            />
            <Pressable hitSlop={8} onPress={() => removeRow(i)} style={styles.del}>
              <Text style={styles.delText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addRow}>
          <Text style={styles.addRow}>+ 공종 추가</Text>
        </Pressable>

        <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
          <Text style={styles.submitText}>{busy ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  muted: { padding: SPACING.xl, color: COLORS.textMuted },
  back: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm, fontWeight: FONT_WEIGHT.semibold },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  desc: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginBottom: SPACING.sm },
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
  rateInput: { width: 110, textAlign: 'right' },
  del: { padding: SPACING.xs },
  delText: { color: COLORS.textLight, fontSize: FONT_SIZE.title },
  addRow: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold, paddingVertical: SPACING.sm },
  submit: { marginTop: SPACING.lg, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold },
});
