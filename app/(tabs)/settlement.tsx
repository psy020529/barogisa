import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useWorkLogs } from '@/hooks/useLedger';
import { updateWorkLogPayment } from '@/services/ledger';
import { formatCurrency } from '@/utils/format';
import type { WorkLog } from '@/types';

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

function unpaidDays(log: WorkLog): number {
  const ref = new Date(log.date);
  const now = new Date();
  return Math.floor((now.getTime() - ref.getTime()) / 86400000);
}

type PartnerGroup = {
  partnerId: string;
  partnerName: string;
  logs: WorkLog[];
  total: number;
  unpaid: number;
  maxUnpaidDays: number;
};

function buildGroups(logs: WorkLog[]): PartnerGroup[] {
  const map = new Map<string, PartnerGroup>();
  for (const log of logs) {
    const key = log.partnerId;
    const g = map.get(key) ?? {
      partnerId: log.partnerId,
      partnerName: log.partnerName ?? '거래처',
      logs: [],
      total: 0,
      unpaid: 0,
      maxUnpaidDays: 0,
    };
    g.logs.push(log);
    g.total += log.amount;
    if (log.payment === 'unpaid') {
      g.unpaid += log.amount;
      g.maxUnpaidDays = Math.max(g.maxUnpaidDays, unpaidDays(log));
    }
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.unpaid - a.unpaid);
}

function settlementText(g: PartnerGroup, month: string): string {
  const lines = [
    `[${monthLabel(month)} 정산 내역]`,
    `거래처: ${g.partnerName}`,
    '',
  ];
  for (const log of g.logs.sort((a, b) => a.date.localeCompare(b.date))) {
    const paid = log.payment === 'paid' ? ' ✓입금' : '';
    lines.push(`• ${log.date} ${formatCurrency(log.amount)}${paid}`);
  }
  lines.push('');
  lines.push(`합계: ${formatCurrency(g.total)}`);
  if (g.unpaid > 0) lines.push(`미수금: ${formatCurrency(g.unpaid)}`);
  return lines.join('\n');
}

export default function SettlementScreen() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(thisMonth);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const logs = useWorkLogs(month);
  const groups = useMemo(() => buildGroups(logs), [logs]);
  const totalAmount = groups.reduce((s, g) => s + g.total, 0);
  const totalUnpaid = groups.reduce((s, g) => s + g.unpaid, 0);

  function prevMonth() {
    const [y, m] = month.split('-').map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    setMonth(prev);
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    if (next <= thisMonth) setMonth(next);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function togglePayment(log: WorkLog) {
    const next = log.payment === 'paid' ? 'unpaid' : 'paid';
    const label = next === 'paid' ? '입금 완료' : '미수금';
    Alert.alert(
      '입금 상태 변경',
      `${log.date} 기록을 "${label}"으로 변경합니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: async () => {
            try {
              await updateWorkLogPayment(log.id, next);
            } catch (e) {
              Alert.alert('오류', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  async function shareText(g: PartnerGroup) {
    const text = settlementText(g, month);
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 월 선택 헤더 */}
      <View style={styles.monthRow}>
        <Pressable style={styles.arrowBtn} onPress={prevMonth}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
        <Pressable
          style={[styles.arrowBtn, month >= thisMonth && styles.arrowDisabled]}
          onPress={nextMonth}
          disabled={month >= thisMonth}
        >
          <Text style={[styles.arrowText, month >= thisMonth && { color: COLORS.textMuted }]}>›</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          <StatCard label="이번달 총합" value={formatCurrency(totalAmount)} tone="default" style={styles.statCard} />
          <StatCard label="미수금" value={formatCurrency(totalUnpaid)} tone={totalUnpaid > 0 ? 'danger' : 'default'} style={styles.statCard} />
        </View>

        {groups.length === 0 && (
          <Text style={styles.empty}>이 달 작업 기록이 없습니다.</Text>
        )}

        {groups.map((g) => {
          const open = expanded.has(g.partnerId);
          return (
            <View key={g.partnerId} style={styles.group}>
              {/* 거래처 헤더 */}
              <Pressable style={styles.groupHeader} onPress={() => toggleExpand(g.partnerId)}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={styles.partnerName}>{g.partnerName}</Text>
                  {g.unpaid > 0 && g.maxUnpaidDays >= 14 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{g.maxUnpaidDays}일</Text>
                    </View>
                  )}
                </View>
                <View style={styles.groupHeaderRight}>
                  <Text style={styles.groupAmount}>{formatCurrency(g.total)}</Text>
                  {g.unpaid > 0 && (
                    <Text style={styles.groupUnpaid}>미수 {formatCurrency(g.unpaid)}</Text>
                  )}
                  <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                </View>
              </Pressable>

              {/* 펼친 상세 */}
              {open && (
                <View style={styles.detail}>
                  {g.logs
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((log) => (
                      <Pressable
                        key={log.id}
                        style={styles.logRow}
                        onPress={() => togglePayment(log)}
                      >
                        <View style={styles.logLeft}>
                          <Text style={styles.logDate}>{log.date}</Text>
                          <Text style={styles.logMemo} numberOfLines={1}>
                            {log.memo ?? ''}
                          </Text>
                        </View>
                        <View style={styles.logRight}>
                          <Text style={styles.logAmount}>{formatCurrency(log.amount)}</Text>
                          <View
                            style={[
                              styles.payBadge,
                              log.payment === 'paid' ? styles.payBadgePaid : styles.payBadgeUnpaid,
                            ]}
                          >
                            <Text
                              style={[
                                styles.payBadgeText,
                                log.payment === 'paid' ? styles.payBadgeTextPaid : styles.payBadgeTextUnpaid,
                              ]}
                            >
                              {log.payment === 'paid' ? '입금' : '미수'}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}

                  {/* 정산 메시지 공유 */}
                  <Pressable style={styles.shareBtn} onPress={() => shareText(g)}>
                    <Text style={styles.shareBtnText}>정산 메시지 공유</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  arrowBtn: { padding: SPACING.sm },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 24, color: COLORS.text, fontWeight: '600' },
  monthLabel: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text, minWidth: 100, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1 },
  empty: { textAlign: 'center', padding: SPACING.xl, color: COLORS.textMuted },
  group: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  groupHeaderRight: { alignItems: 'flex-end', gap: 2 },
  partnerName: { fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.text },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  groupAmount: { fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.text },
  groupUnpaid: { fontSize: FONT_SIZE.caption, color: COLORS.danger },
  chevron: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  detail: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  logLeft: { flex: 1, gap: 2 },
  logDate: { fontSize: FONT_SIZE.caption, color: COLORS.text },
  logMemo: { fontSize: 11, color: COLORS.textMuted },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logAmount: { fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.text },
  payBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  payBadgePaid: { backgroundColor: COLORS.success + '22' },
  payBadgeUnpaid: { backgroundColor: COLORS.danger + '22' },
  payBadgeText: { fontSize: 10, fontWeight: '700' },
  payBadgeTextPaid: { color: COLORS.success },
  payBadgeTextUnpaid: { color: COLORS.danger },
  shareBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: FONT_SIZE.caption, color: COLORS.primary, fontWeight: '600' },
});
