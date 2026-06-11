import { router } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useMyApplications, useOpenJobs } from '@/hooks/useJobs';
import { formatCurrencyShort } from '@/utils/format';

// 일감 찾기: 모집 중인 공개 일감 탐색 + 한 탭 지원 (상세 화면에서)
export default function FindJobs() {
  const { user } = useAuth();
  const openJobs = useOpenJobs();
  const myApps = useMyApplications(user?.id);

  const appliedJobIds = new Set(myApps.map((a) => a.jobId));
  const pendingCount = myApps.filter((a) => a.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>일감 찾기</Text>
        {pendingCount > 0 && (
          <Text style={styles.headerNote}>선택 대기 {pendingCount}건</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        {openJobs.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>지금 모집 중인 일감이 없습니다.</Text>
            <Text style={styles.emptySub}>새 일감이 올라오면 여기에 표시됩니다.</Text>
          </View>
        )}

        {openJobs.map((job) => {
          const applied = appliedJobIds.has(job.id);
          return (
            <Pressable
              key={job.id}
              style={styles.card}
              onPress={() => router.push(`/job/${job.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardDate}>{job.date}</Text>
                {applied && (
                  <View style={styles.appliedBadge}>
                    <Text style={styles.appliedBadgeText}>지원함</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>
                {job.factoryName} · {PROCESS_LABEL[job.process]}
              </Text>
              <Text style={styles.cardAddr}>{job.address}</Text>
              <Text style={styles.cardAmount}>{formatCurrencyShort(job.amount)}원</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text },
  headerNote: { fontSize: FONT_SIZE.caption, color: COLORS.warning, fontWeight: '600' },
  emptyBox: { alignItems: 'center', padding: SPACING.xxl },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  emptySub: { fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: SPACING.xs },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  appliedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warning,
  },
  appliedBadgeText: { fontSize: FONT_SIZE.caption, color: '#fff', fontWeight: '600' },
  cardTitle: { fontSize: FONT_SIZE.title, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  cardAddr: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  cardAmount: { fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.primary, marginTop: 6 },
});
