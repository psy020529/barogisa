import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { COLORS, FONT_SIZE, FONT_WEIGHT, JOB_COLORS, RADIUS, SPACING } from '@/constants';
import { useWorkLogs } from '@/hooks/useLedger';
import { WORK_TYPE_LABEL, type WorkLog } from '@/types';
import { formatCurrency, formatCurrencyShort } from '@/utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthOf = (iso: string) => iso.slice(0, 7); // YYYY-MM
const OVERDUE_DAYS = 14;

export default function CalendarScreen() {
  const [selected, setSelected] = useState<string>(todayIso());
  const month = monthOf(selected);
  const logs = useWorkLogs(month);

  // 날짜별 집계
  const byDate = useMemo(() => {
    const map: Record<string, { amount: number; hasUnpaid: boolean }> = {};
    logs.forEach((l) => {
      const e = (map[l.date] ??= { amount: 0, hasUnpaid: false });
      e.amount += l.amount;
      if (l.payment === 'unpaid') e.hasUnpaid = true;
    });
    return map;
  }, [logs]);

  const summary = useMemo(() => {
    const income = logs.reduce((s, l) => s + l.amount, 0);
    const unpaidLogs = logs.filter((l) => l.payment === 'unpaid');
    const unpaid = unpaidLogs.reduce((s, l) => s + l.amount, 0);
    const today = todayIso();
    const overdue = unpaidLogs.filter(
      (l) => differenceInCalendarDays(parseISO(today), parseISO(l.date)) >= OVERDUE_DAYS,
    ).length;
    return { income, unpaid, overdue, count: logs.length };
  }, [logs]);

  const daySlots = logs.filter((l) => l.date === selected);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.appbar}>
          <Text style={styles.title}>캘린더</Text>
          <Pressable hitSlop={10} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <StatCard label="이번 달 수익" value={`${formatCurrencyShort(summary.income)}원`} tone="success" />
          <StatCard
            label="미수금"
            value={`${formatCurrencyShort(summary.unpaid)}원`}
            tone="danger"
          />
        </View>
        {summary.overdue > 0 && (
          <Text style={styles.overdueNote}>⚠ 14일 경과 미수 {summary.overdue}건 — 정산 탭에서 확인</Text>
        )}

        <View style={styles.calendarCard}>
          <Calendar
            current={selected}
            onMonthChange={(m) => setSelected(`${m.year}-${String(m.month).padStart(2, '0')}-01`)}
            theme={{ arrowColor: COLORS.primary, textMonthFontWeight: '700', monthTextColor: COLORS.text }}
            dayComponent={({ date, state }) =>
              date ? (
                <DayCell
                  dateString={date.dateString}
                  day={date.day}
                  state={state}
                  agg={byDate[date.dateString]}
                  isSelected={date.dateString === selected}
                  onPress={setSelected}
                />
              ) : (
                <View style={styles.cell} />
              )
            }
          />
        </View>

        <Text style={styles.dayHeader}>
          {formatDayHeader(selected)} · {daySlots.length}건
          {daySlots.length > 0 && `  ·  ${formatCurrency(daySlots.reduce((s, l) => s + l.amount, 0))}`}
        </Text>
        {daySlots.length === 0 ? (
          <Text style={styles.empty}>
            {summary.count === 0
              ? '기록을 추가하면 여기에 수익이 쌓입니다.'
              : '이 날짜에 기록이 없습니다.'}
          </Text>
        ) : (
          daySlots.map((l) => <LogRow key={l.id} log={l} />)
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/work/new')}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

function formatDayHeader(iso: string) {
  const d = parseISO(iso);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}

const manWon = (n: number) => (n >= 10000 ? `${Math.round(n / 10000)}만` : `${n}`);

function DayCell({
  dateString,
  day,
  state,
  agg,
  isSelected,
  onPress,
}: {
  dateString: string;
  day: number;
  state?: string;
  agg?: { amount: number; hasUnpaid: boolean };
  isSelected: boolean;
  onPress: (d: string) => void;
}) {
  const isToday = state === 'today';
  const disabled = state === 'disabled';
  const dow = parseISO(dateString).getDay();
  const numColor = disabled
    ? COLORS.textLight
    : dow === 0
      ? COLORS.weekendSun
      : dow === 6
        ? COLORS.weekendSat
        : COLORS.text;

  return (
    <Pressable style={[styles.cell, isSelected && styles.cellSelected]} onPress={() => onPress(dateString)}>
      <View style={[styles.cellNumWrap, isToday && styles.cellTodayNum]}>
        <Text style={[styles.cellNum, { color: isToday ? '#fff' : numColor }]}>{day}</Text>
      </View>
      {agg && <View style={[styles.dot, { backgroundColor: agg.hasUnpaid ? JOB_COLORS.wait : JOB_COLORS.done }]} />}
      {agg && <Text style={styles.cellAmt}>{manWon(agg.amount)}</Text>}
    </Pressable>
  );
}

function LogRow({ log }: { log: WorkLog }) {
  const overdue =
    log.payment === 'unpaid'
      ? differenceInCalendarDays(parseISO(todayIso()), parseISO(log.date))
      : 0;
  return (
    <Pressable style={styles.logRow} onPress={() => router.push(`/work/${log.id}`)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.logTitle} numberOfLines={1}>
          {log.partnerName ?? '거래처'} · {WORK_TYPE_LABEL[log.workType]}
        </Text>
        <Text style={styles.logMeta} numberOfLines={1}>
          팀원 {log.memberIds.length}명
          {log.days > 1 ? ` · ${log.days}일` : ''}
          {log.photos.length > 0 ? ` · 사진 ${log.photos.length}` : ''}
          {log.memo ? ` · ${log.memo}` : ''}
        </Text>
      </View>
      <View style={styles.logRight}>
        <Text style={styles.logAmt}>{formatCurrencyShort(log.amount)}원</Text>
        {log.payment === 'paid' ? (
          <View style={[styles.badge, { backgroundColor: COLORS.successSurface }]}>
            <Text style={[styles.badgeText, { color: COLORS.success }]}>입금완료</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: COLORS.warningSurface }]}>
            <Text style={[styles.badgeText, { color: COLORS.warning }]}>
              {overdue >= OVERDUE_DAYS ? `미수 ${overdue}일` : '미수금'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  summaryRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  overdueNote: {
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZE.caption,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.semibold,
  },
  calendarCard: {
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cell: { width: '100%', minHeight: 56, paddingTop: 3, alignItems: 'center' },
  cellSelected: { backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.sm },
  cellNumWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cellTodayNum: { backgroundColor: COLORS.primary },
  cellNum: { fontSize: 13, fontWeight: '600' },
  dot: { position: 'absolute', right: 6, top: 6, width: 5, height: 5, borderRadius: 3 },
  cellAmt: { fontSize: 9, fontWeight: '700', color: COLORS.success, marginTop: 1 },
  dayHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  empty: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg, color: COLORS.textMuted, textAlign: 'center' },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  logTitle: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  logMeta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 3 },
  logRight: { alignItems: 'flex-end', marginLeft: SPACING.sm },
  logAmt: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  badge: { marginTop: 4, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 1 },
  badgeText: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
