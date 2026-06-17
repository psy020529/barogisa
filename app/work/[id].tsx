import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { useMembers } from '@/hooks/useLedger';
import { deleteWorkLog, getWorkLog, updateWorkLogPayment } from '@/services/ledger';
import { WORK_TYPE_LABEL, type WorkLog } from '@/types';
import { formatCurrency } from '@/utils/format';

export default function WorkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const members = useMembers();
  const [log, setLog] = useState<WorkLog | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = () => getWorkLog(id).then(setLog).catch(() => setLog(null));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const togglePay = async () => {
    if (!log) return;
    setBusy(true);
    try {
      await updateWorkLogPayment(log.id, log.payment === 'paid' ? 'unpaid' : 'paid');
      await load();
    } catch (e) {
      Alert.alert('처리 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!log) return;
    Alert.alert('기록 삭제', '이 작업 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkLog(log.id);
            router.replace('/(tabs)/calendar');
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  if (log === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (log === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>기록을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const memberNames = log.memberIds
    .map((mid) => members.find((m) => m.id === mid)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 닫기</Text>
        </Pressable>

        <Text style={styles.partner}>{log.partnerName ?? '거래처'}</Text>
        <Text style={styles.type}>{WORK_TYPE_LABEL[log.workType]}</Text>
        <Text style={styles.amount}>{formatCurrency(log.amount)}</Text>

        <View style={styles.divider} />
        <Row label="날짜" value={log.date} />
        <Row label="팀원" value={memberNames || `${log.memberIds.length}명`} />
        <Row label="일수" value={`${log.days}일`} />
        <Row label="단가" value={`${formatCurrency(log.unitRate)} / 인·일${log.isManual ? ' (수기보정)' : ''}`} />
        {log.memo ? <Row label="메모" value={log.memo} /> : null}
        <Row label="입금" value={log.payment === 'paid' ? '입금완료' : '미수금'} />

        <Pressable
          style={[styles.btn, log.payment === 'paid' ? styles.btnGhost : styles.btnPrimary, busy && { opacity: 0.6 }]}
          onPress={togglePay}
          disabled={busy}
        >
          <Text style={log.payment === 'paid' ? styles.btnGhostText : styles.btnPrimaryText}>
            {log.payment === 'paid' ? '미수금으로 되돌리기' : '입금 완료 처리'}
          </Text>
        </Pressable>

        <Pressable onPress={remove} style={styles.deleteWrap}>
          <Text style={styles.deleteText}>기록 삭제</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { padding: SPACING.xl, color: COLORS.textMuted },
  back: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm, fontWeight: FONT_WEIGHT.semibold },
  partner: { marginTop: SPACING.sm, fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  type: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: 2 },
  amount: { fontSize: FONT_SIZE.display, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text, marginTop: SPACING.sm },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  row: { flexDirection: 'row', paddingVertical: SPACING.sm },
  rowLabel: { width: 70, fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  rowValue: { flex: 1, fontSize: FONT_SIZE.body, color: COLORS.text },
  btn: { marginTop: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border },
  btnGhostText: { color: COLORS.text, fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.semibold },
  deleteWrap: { alignSelf: 'center', marginTop: SPACING.xl },
  deleteText: { color: COLORS.danger, fontSize: FONT_SIZE.caption, textDecorationLine: 'underline' },
});
