import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDriverJobs } from '@/hooks/useJobs';
import { updateJobStatus } from '@/services/jobsApi';
import { shareInvoicePdf } from '@/services/invoicePdf';
import type { Job } from '@/types';
import { formatCurrency } from '@/utils/format';

type Group = {
  factoryId: string;
  factoryName: string;
  jobs: Job[];
  total: number;
  unpaid: number;
};

export default function SettlementScreen() {
  const { user } = useAuth();
  const jobs = useDriverJobs(user?.id);
  const [busy, setBusy] = useState(false);

  // 정산 대상 = 완료(미수금) + 수금 완료 (이력)
  const eligibleJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'paid');

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    eligibleJobs.forEach((job) => {
      const g = map.get(job.factoryId) ?? {
        factoryId: job.factoryId,
        factoryName: job.factoryName,
        jobs: [],
        total: 0,
        unpaid: 0,
      };
      g.jobs.push(job);
      g.total += job.amount;
      if (job.status !== 'paid') g.unpaid += job.amount;
      map.set(job.factoryId, g);
    });
    return Array.from(map.values()).sort((a, b) => b.unpaid - a.unpaid);
  }, [eligibleJobs]);

  const totalUnpaid = groups.reduce((s, g) => s + g.unpaid, 0);

  const generatePdf = async (g: Group) => {
    if (!user) return;
    setBusy(true);
    try {
      await shareInvoicePdf({ factoryName: g.factoryName, driverName: user.name, jobs: g.jobs });
    } catch (e) {
      Alert.alert('PDF 생성 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const markPaid = (g: Group) => {
    Alert.alert(
      '수금 확인',
      `${g.factoryName}으로부터 ${formatCurrency(g.unpaid)}을 수금했습니까?\n수금 완료로 표시됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '수금 완료',
          onPress: async () => {
            try {
              await Promise.all(
                g.jobs
                  .filter((j) => j.status !== 'paid')
                  .map((j) => updateJobStatus(j.id, 'paid', { paidAt: Date.now() })),
              );
            } catch (e) {
              Alert.alert('처리 실패', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <StatCard
          label="총 미수금"
          value={formatCurrency(totalUnpaid)}
          tone="danger"
          size="lg"
          style={{ marginBottom: SPACING.md }}
        />

        {groups.length === 0 && <Text style={styles.empty}>정산할 시공 내역이 없습니다.</Text>}

        {groups.map((g) => (
          <View key={g.factoryId} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.factoryName}>{g.factoryName}</Text>
              <Text style={styles.unpaidAmount}>{formatCurrency(g.unpaid)}</Text>
            </View>
            <Text style={styles.summary}>
              총 {g.jobs.length}건 · 합계 {formatCurrency(g.total)}
            </Text>

            {g.jobs.map((j) => (
              <View key={j.id} style={styles.jobLine}>
                <Text style={styles.jobLineLeft}>
                  {j.date} · {j.address.slice(0, 14)}
                </Text>
                <Text style={[styles.jobLineRight, j.status === 'paid' && { color: COLORS.success }]}>
                  {j.status === 'paid' ? '수금' : '미수금'} · {formatCurrency(j.amount)}
                </Text>
              </View>
            ))}

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnOutline]}
                onPress={() => generatePdf(g)}
                disabled={busy}
              >
                <Text style={styles.btnOutlineText}>청구서 PDF</Text>
              </Pressable>
              {g.unpaid > 0 && (
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => markPaid(g)}>
                  <Text style={styles.btnPrimaryText}>수금 완료 처리</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { textAlign: 'center', padding: SPACING.xl, color: COLORS.textMuted },
  group: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    marginBottom: SPACING.md,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factoryName: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  unpaidAmount: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.danger },
  summary: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  jobLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  jobLineLeft: { fontSize: FONT_SIZE.caption, color: COLORS.text },
  jobLineRight: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  btnOutline: { borderWidth: 1, borderColor: COLORS.primary },
  btnOutlineText: { color: COLORS.primary, fontWeight: '600' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
});
