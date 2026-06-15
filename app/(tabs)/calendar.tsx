import { endOfMonth, endOfWeek, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, JOB_COLORS, JOB_STATUS_TONE, JOB_SURFACE, PROCESS_LABEL, RADIUS, SPACING, type JobTone } from '@/constants';
import { StatCard } from '@/components/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { useDriverJobs, useMyApplications, useOpenJobs } from '@/hooks/useJobs';
import type { Job } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

// 상태별 라벨 (색은 tone → JOB_COLORS, docs/DESIGN.md)
const MY_JOB_LABEL: Record<string, string> = {
  requested: '신규 지명 · 수락 필요',
  accepted: '수락함 · 공장 확정 대기',
  confirmed: '확정',
  checked_in: '시공 중',
  completed: '완료',
  paid: '수금 완료',
};

type Slot = { job: Job; tone: JobTone; label: string };

// 나에게 배정된 일감(지명 수락/확정/진행/완료)
function myJobSlot(job: Job): Slot | null {
  if (job.status === 'rejected' || job.status === 'cancelled') return null;
  return { job, tone: JOB_STATUS_TONE[job.status], label: MY_JOB_LABEL[job.status] ?? '' };
}

// 공개 모집 일감 (driver_id 미정)
function openSlot(job: Job, applied: boolean): Slot {
  return applied
    ? { job, tone: 'wait', label: '지원함 · 선택 대기' }
    : { job, tone: 'new', label: '지원 가능' };
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const jobs = useDriverJobs(user?.id);
  const openJobs = useOpenJobs();
  const myApps = useMyApplications(user?.id);
  const [selected, setSelected] = useState<string>(todayIso());

  const appliedJobIds = useMemo(() => new Set(myApps.map((a) => a.jobId)), [myApps]);

  // 날짜별 슬롯(내 일감 + 공개 일감)
  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    jobs.forEach((job) => {
      const s = myJobSlot(job);
      if (!s) return;
      (map[job.date] ??= []).push(s);
    });
    openJobs.forEach((job) => {
      (map[job.date] ??= []).push(openSlot(job, appliedJobIds.has(job.id)));
    });
    return map;
  }, [jobs, openJobs, appliedJobIds]);


  // 지금 할 일 안내 배너 — 가장 급한 액션 하나만
  const banner = useMemo(() => {
    const today = todayIso();
    const newRequests = jobs.filter((j) => j.status === 'requested');
    if (newRequests.length > 0)
      return { text: `🔴 새 지명 ${newRequests.length}건 — 수락/거절을 결정하세요`, onPress: () => router.push(`/job/${newRequests[0].id}`) };
    const checkedIn = jobs.find((j) => j.status === 'checked_in');
    if (checkedIn)
      return { text: '🔵 진행 중인 시공 — 끝나면 체크아웃하세요', onPress: () => router.push(`/job/${checkedIn.id}`) };
    const todayConfirmed = jobs.find((j) => j.status === 'confirmed' && j.date === today);
    if (todayConfirmed)
      return { text: '🔵 오늘 시공 — 현장 도착하면 체크인하세요', onPress: () => router.push(`/job/${todayConfirmed.id}`) };
    const applyable = openJobs.filter((j) => !appliedJobIds.has(j.id));
    if (applyable.length > 0)
      return { text: `🔴 지원 가능한 일감 ${applyable.length}건 — 지원해보세요`, onPress: () => setSelected(applyable[0].date) };
    return null;
  }, [jobs, openJobs, appliedJobIds]);

  const summary = useMemo(() => {
    const now = new Date();
    const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };
    const weekRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    const monthIncome = jobs
      .filter((j) => (j.status === 'completed' || j.status === 'paid') && isWithinInterval(parseISO(j.date), monthRange))
      .reduce((s, j) => s + j.amount, 0);
    const unpaid = jobs.filter((j) => j.status === 'completed').reduce((s, j) => s + j.amount, 0);
    const weekCount = jobs.filter(
      (j) => (j.status === 'confirmed' || j.status === 'accepted') && isWithinInterval(parseISO(j.date), weekRange),
    ).length;
    return { monthIncome, unpaid, weekCount };
  }, [jobs]);

  const daySlots = slotsByDate[selected] ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <View style={styles.summaryRow}>
          <StatCard label="이번달 수익" value={`${formatCurrencyShort(summary.monthIncome)}원`} tone="success" />
          <StatCard label="미수금" value={`${formatCurrencyShort(summary.unpaid)}원`} tone="danger" />
          <StatCard label="이번주 일감" value={`${summary.weekCount}건`} tone="primary" />
        </View>

        {banner && (
          <Pressable style={styles.banner} onPress={banner.onPress}>
            <Text style={styles.bannerText}>{banner.text}</Text>
            <Text style={styles.bannerArrow}>›</Text>
          </Pressable>
        )}

        <View style={styles.calendarCard}>
          <Calendar
            current={selected}
            theme={{
              arrowColor: COLORS.primary,
              textMonthFontWeight: '700',
              monthTextColor: COLORS.text,
            }}
            dayComponent={({ date, state }) =>
              date ? (
                <DayCell
                  dateString={date.dateString}
                  day={date.day}
                  state={state}
                  slots={slotsByDate[date.dateString] ?? []}
                  isSelected={date.dateString === selected}
                  onPress={setSelected}
                />
              ) : (
                <View style={styles.cell} />
              )
            }
          />
        </View>

        <View style={styles.legendRow}>
          <Legend color={JOB_COLORS.new} label="신규·지원가능" />
          <Legend color={JOB_COLORS.wait} label="대기" />
          <Legend color={JOB_COLORS.active} label="확정·진행" />
          <Legend color={JOB_COLORS.done} label="완료" />
        </View>

        <Text style={styles.dayHeader}>
          {formatDayHeader(selected)} · {daySlots.length}건
        </Text>
        {daySlots.length === 0 ? (
          <Text style={styles.empty}>이 날짜에 일정이 없습니다</Text>
        ) : (
          daySlots.map((slot) => <SlotRow key={slot.job.id} slot={slot} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDayHeader(iso: string) {
  const d = parseISO(iso);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}

// TimeBlocks풍 날짜 셀 — 날짜 칸 안에 색 이벤트 바가 쌓인다
function DayCell({
  dateString,
  day,
  state,
  slots,
  isSelected,
  onPress,
}: {
  dateString: string;
  day: number;
  state?: string;
  slots: Slot[];
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
  const shown = slots.slice(0, 3);
  const extra = slots.length - shown.length;

  return (
    <Pressable style={[styles.cell, isSelected && styles.cellSelected]} onPress={() => onPress(dateString)}>
      <View style={[styles.cellNumWrap, isToday && styles.cellTodayNum]}>
        <Text style={[styles.cellNum, { color: isToday ? '#fff' : numColor }]}>{day}</Text>
      </View>
      {shown.map((s, i) => (
        <View key={i} style={[styles.cellBar, { backgroundColor: JOB_COLORS[s.tone] }]}>
          <Text style={styles.cellBarText} numberOfLines={1}>
            {s.job.factoryName}
          </Text>
        </View>
      ))}
      {extra > 0 && <Text style={styles.cellMore}>+{extra}</Text>}
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function SlotRow({ slot }: { slot: Slot }) {
  const { job, tone, label } = slot;
  const color = JOB_COLORS[tone];
  return (
    <Pressable
      style={[styles.jobRow, { backgroundColor: JOB_SURFACE[tone] }]}
      onPress={() => router.push(`/job/${job.id}`)}
    >
      <View style={styles.jobTopRow}>
        <View style={styles.jobTitleWrap}>
          <View style={[styles.toneDot, { backgroundColor: color }]} />
          <Text style={styles.jobFactory} numberOfLines={1}>
            {job.factoryName}
          </Text>
        </View>
        <Text style={[styles.jobLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.jobMeta} numberOfLines={1}>
        {PROCESS_LABEL[job.process]} · {job.address}
      </Text>
      <Text style={styles.jobAmount}>{formatCurrencyShort(job.amount)}원</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summaryRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warningSurface,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  bannerText: { flex: 1, fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.text },
  bannerArrow: { fontSize: FONT_SIZE.heading, color: COLORS.textMuted, marginLeft: SPACING.sm },
  calendarCard: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cell: {
    width: '100%',
    minHeight: 62,
    paddingTop: 2,
    paddingHorizontal: 1,
    alignItems: 'stretch',
  },
  cellSelected: { backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.sm },
  cellNumWrap: { alignSelf: 'center', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  cellTodayNum: { backgroundColor: COLORS.primary },
  cellNum: { fontSize: 13, fontWeight: '600' },
  cellBar: { borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 2 },
  cellBarText: { fontSize: 8, color: '#fff', fontWeight: '600' },
  cellMore: { fontSize: 8, color: COLORS.textMuted, paddingLeft: 3 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  dayHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    fontSize: FONT_SIZE.title,
    fontWeight: '700',
    color: COLORS.text,
  },
  empty: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg, color: COLORS.textMuted, textAlign: 'center' },
  jobRow: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  jobTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  jobTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  toneDot: { width: 10, height: 10, borderRadius: 5 },
  jobFactory: { flex: 1, fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  jobLabel: { fontSize: FONT_SIZE.caption, fontWeight: '700' },
  jobMeta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 4 },
  jobAmount: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text, marginTop: 6 },
});
