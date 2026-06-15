import { endOfMonth, endOfWeek, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SCHEDULE_COLORS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDriverJobs, useMyApplications, useOpenJobs } from '@/hooks/useJobs';
import type { Job } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

// 의미 중심 4색 — 빨강:신규/지원가능, 노랑:대기, 파랑:확정/진행, 초록:완료/수금
const C = {
  new: SCHEDULE_COLORS.newJob, // 빨강
  wait: SCHEDULE_COLORS.pending, // 노랑(주황)
  active: SCHEDULE_COLORS.myJob, // 파랑
  done: SCHEDULE_COLORS.companyJob, // 초록
  gray: COLORS.textLight,
};

type Slot = { job: Job; color: string; label: string };

// 나에게 배정된 일감(지명 수락/확정/진행/완료)
function myJobSlot(job: Job): Slot | null {
  switch (job.status) {
    case 'requested':
      return { job, color: C.new, label: '신규 지명 · 수락 필요' };
    case 'accepted':
      return { job, color: C.wait, label: '수락함 · 공장 확정 대기' };
    case 'confirmed':
      return { job, color: C.active, label: '확정' };
    case 'checked_in':
      return { job, color: C.active, label: '시공 중' };
    case 'completed':
      return { job, color: C.done, label: '완료' };
    case 'paid':
      return { job, color: C.done, label: '수금 완료' };
    default:
      return null; // rejected/cancelled 는 캘린더에서 숨김
  }
}

// 공개 모집 일감 (driver_id 미정)
function openSlot(job: Job, applied: boolean): Slot {
  return applied
    ? { job, color: C.wait, label: '지원함 · 선택 대기' }
    : { job, color: C.new, label: '지원 가능' };
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

  const markedDates = useMemo(() => {
    const result: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    Object.entries(slotsByDate).forEach(([date, slots]) => {
      // 같은 색은 한 점으로 합쳐 과밀 방지
      const colors = Array.from(new Set(slots.map((s) => s.color)));
      result[date] = { dots: colors.map((c, i) => ({ key: `${date}-${i}`, color: c })) };
    });
    result[selected] = { ...(result[selected] ?? { dots: [] }), selected: true, selectedColor: COLORS.primary };
    return result;
  }, [slotsByDate, selected]);

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
          <SummaryCell label="이번달 수익" value={`${formatCurrencyShort(summary.monthIncome)}원`} accent={C.done} />
          <SummaryCell label="미수금" value={`${formatCurrencyShort(summary.unpaid)}원`} accent={C.new} />
          <SummaryCell label="이번주 일감" value={`${summary.weekCount}건`} accent={C.active} />
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
            onDayPress={(d) => setSelected(d.dateString)}
            markingType="multi-dot"
            markedDates={markedDates}
            theme={{
              todayTextColor: COLORS.primary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: '#fff',
              arrowColor: COLORS.primary,
              textMonthFontWeight: '700',
              textDayFontWeight: '500',
            }}
          />
        </View>

        <View style={styles.legendRow}>
          <Legend color={C.new} label="신규·지원가능" />
          <Legend color={C.wait} label="대기" />
          <Legend color={C.active} label="확정·진행" />
          <Legend color={C.done} label="완료" />
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

function SummaryCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.summaryCell, { borderLeftColor: accent }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
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
  const { job, color, label } = slot;
  return (
    <Pressable style={styles.jobRow} onPress={() => router.push(`/job/${job.id}`)}>
      <View style={[styles.statusBar, { backgroundColor: color }]} />
      <View style={{ flex: 1, padding: SPACING.md }}>
        <View style={styles.jobTopRow}>
          <Text style={styles.jobFactory} numberOfLines={1}>
            {job.factoryName}
          </Text>
          <View style={[styles.pill, { backgroundColor: color }]}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        </View>
        <Text style={styles.jobMeta} numberOfLines={1}>
          {PROCESS_LABEL[job.process]} · {job.address}
        </Text>
        <Text style={styles.jobAmount}>{formatCurrencyShort(job.amount)}원</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summaryRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  summaryCell: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4 },
  summaryLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  summaryValue: { marginTop: 4, fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
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
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  statusBar: { width: 5, alignSelf: 'stretch' },
  jobTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  jobFactory: { flex: 1, fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  pill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: FONT_SIZE.caption, color: '#fff', fontWeight: '700' },
  jobMeta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 4 },
  jobAmount: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text, marginTop: 6 },
});
