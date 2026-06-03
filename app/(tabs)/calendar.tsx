import { endOfMonth, endOfWeek, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SCHEDULE_COLORS, SPACING, STATUS_LABEL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDriverJobs } from '@/hooks/useJobs';
import type { Job, JobStatus } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

function colorForStatus(status: JobStatus): string {
  if (status === 'requested') return SCHEDULE_COLORS.newJob;
  if (status === 'accepted') return SCHEDULE_COLORS.pending;
  return SCHEDULE_COLORS.myJob; // confirmed/checked_in/completed/paid
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const jobs = useDriverJobs(user?.id);
  const [selected, setSelected] = useState<string>(todayIso());

  const markedDates = useMemo(() => {
    const result: Record<string, { dots: { color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    jobs.forEach((job) => {
      if (!result[job.date]) result[job.date] = { dots: [] };
      result[job.date].dots.push({ color: colorForStatus(job.status) });
    });
    if (!result[selected]) result[selected] = { dots: [] };
    result[selected] = { ...result[selected], selected: true, selectedColor: COLORS.primary };
    return result;
  }, [jobs, selected]);

  const summary = useMemo(() => {
    const now = new Date();
    const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };
    const weekRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };

    const monthIncome = jobs
      .filter((j) => (j.status === 'completed' || j.status === 'paid') && isWithinInterval(parseISO(j.date), monthRange))
      .reduce((s, j) => s + j.amount, 0);

    const unpaid = jobs
      .filter((j) => j.status === 'completed')
      .reduce((s, j) => s + j.amount, 0);

    const weekCount = jobs.filter(
      (j) => (j.status === 'confirmed' || j.status === 'accepted') && isWithinInterval(parseISO(j.date), weekRange),
    ).length;

    return { monthIncome, unpaid, weekCount };
  }, [jobs]);

  const dayJobs = jobs.filter((j) => j.date === selected);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.summaryRow}>
          <SummaryCell label="이번달 수익" value={`${formatCurrencyShort(summary.monthIncome)}원`} accent={COLORS.success} />
          <SummaryCell label="미수금" value={`${formatCurrencyShort(summary.unpaid)}원`} accent={COLORS.danger} />
          <SummaryCell label="이번주 일감" value={`${summary.weekCount}건`} accent={COLORS.primary} />
        </View>

        <Calendar
          current={selected}
          onDayPress={(d) => setSelected(d.dateString)}
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            todayTextColor: COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
            arrowColor: COLORS.primary,
          }}
        />

        <View style={styles.legendRow}>
          <Legend color={SCHEDULE_COLORS.newJob} label="신규" />
          <Legend color={SCHEDULE_COLORS.pending} label="수락(확정 대기)" />
          <Legend color={SCHEDULE_COLORS.myJob} label="확정/진행/완료" />
        </View>

        <Text style={styles.dayHeader}>{selected} 일정 ({dayJobs.length}건)</Text>
        {dayJobs.length === 0 ? (
          <Text style={styles.empty}>일정이 없습니다</Text>
        ) : (
          dayJobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
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

function JobRow({ job }: { job: Job }) {
  return (
    <Pressable style={styles.jobRow} onPress={() => router.push(`/job/${job.id}`)}>
      <View style={[styles.statusBar, { backgroundColor: colorForStatus(job.status) }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.jobFactory}>{job.factoryName}</Text>
        <Text style={styles.jobMeta}>
          {PROCESS_LABEL[job.process]} · {job.address}
        </Text>
        <Text style={styles.jobStatus}>{STATUS_LABEL[job.status]}</Text>
      </View>
      <Text style={styles.jobAmount}>{formatCurrencyShort(job.amount)}원</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  summaryLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  summaryValue: { marginTop: 4, fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  legendRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  dayHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    fontSize: FONT_SIZE.title,
    fontWeight: '600',
    color: COLORS.text,
  },
  empty: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, color: COLORS.textMuted },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  jobFactory: { fontSize: FONT_SIZE.title, fontWeight: '600', color: COLORS.text, padding: SPACING.md, paddingBottom: 2 },
  jobMeta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, paddingHorizontal: SPACING.md },
  jobStatus: { fontSize: FONT_SIZE.caption, color: COLORS.textLight, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, marginTop: 2 },
  jobAmount: { paddingRight: SPACING.md, fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
});
