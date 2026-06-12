import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SCHEDULE_COLORS, SPACING, STATUS_LABEL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useFactoryJobs } from '@/hooks/useJobs';
import { useMyFactory } from '@/hooks/useMyFactory';
import { updateJobStatus } from '@/services/jobsApi';
import type { Job, JobStatus } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

function colorForStatus(status: JobStatus): string {
  if (status === 'requested') return SCHEDULE_COLORS.newJob;
  if (status === 'accepted') return SCHEDULE_COLORS.pending;
  return SCHEDULE_COLORS.myJob;
}

export default function FactoryHome() {
  const { user, signOut } = useAuth();
  const factory = useMyFactory(user?.id, user?.name);
  const jobs = useFactoryJobs(factory.factoryId ?? undefined);

  // 지금 할 일 안내 — 가장 급한 액션 하나만
  const openRecruiting = jobs.filter(
    (j) => j.listingType === 'open' && !j.driverId && j.status === 'requested',
  );
  const awaitingConfirm = jobs.filter((j) => j.status === 'accepted');
  const banner =
    awaitingConfirm.length > 0
      ? `🟠 기사 수락 ${awaitingConfirm.length}건 — [최종 확정]을 눌러 거래를 성사시키세요`
      : openRecruiting.length > 0
        ? `🟣 공개 모집 ${openRecruiting.length}건 진행 중 — [지원자 보기]에서 기사를 선택하세요`
        : null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const confirm = (job: Job) => {
    Alert.alert('확정', `${job.factoryName} → 기사 수락 일감을 확정합니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '확정',
        onPress: async () => {
          try {
            await updateJobStatus(job.id, 'confirmed');
          } catch (e) {
            Alert.alert('처리 실패', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{factory.factoryName ?? '공장 홈'}</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          {user?.isAdmin && (
            <Pressable onPress={() => router.replace('/(tabs)/calendar')}>
              <Text style={styles.linkText}>기사 화면</Text>
            </Pressable>
          )}
          <Pressable onPress={handleSignOut}>
            <Text style={styles.signOut}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.cta, !factory.factoryId && styles.ctaDisabled]}
        onPress={() => factory.factoryId && router.push('/factory/register')}
        disabled={!factory.factoryId}
      >
        <Text style={styles.ctaText}>
          {factory.loading ? '준비 중...' : '＋ 새 일감 발주'}
        </Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        {banner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        )}
        {jobs.length === 0 && !factory.loading && (
          <Text style={styles.empty}>발주한 일감이 없습니다. [＋ 새 일감 발주]로 시작하세요.</Text>
        )}
        {jobs.map((job) => {
          const isOpenRecruiting =
            job.listingType === 'open' && !job.driverId && job.status === 'requested';
          return (
            <View key={job.id} style={styles.card}>
              <View style={[styles.statusBar, { backgroundColor: colorForStatus(job.status) }]} />
              <View style={{ flex: 1, padding: SPACING.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardDate}>{job.date} · {PROCESS_LABEL[job.process]}</Text>
                  {job.status !== 'completed' && job.status !== 'paid' && job.status !== 'cancelled' && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push(`/factory/register?jobId=${job.id}`)}
                    >
                      <Text style={styles.editLink}>수정</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.cardAddr}>{job.address}</Text>
                <Text style={styles.cardStatus}>
                  {isOpenRecruiting ? '공개 모집 중' : STATUS_LABEL[job.status]} · {formatCurrencyShort(job.amount)}원
                </Text>
                {isOpenRecruiting && (
                  <Pressable
                    style={styles.confirmBtn}
                    onPress={() => router.push(`/factory/applicants?jobId=${job.id}`)}
                  >
                    <Text style={styles.confirmBtnText}>지원자 보기</Text>
                  </Pressable>
                )}
                {job.status === 'accepted' && (
                  <Pressable style={styles.confirmBtn} onPress={() => confirm(job)}>
                    <Text style={styles.confirmBtnText}>최종 확정</Text>
                  </Pressable>
                )}
              </View>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, flex: 1 },
  linkText: { color: COLORS.primary, fontWeight: '600' },
  signOut: { color: COLORS.danger },
  cta: {
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '700' },
  empty: { textAlign: 'center', padding: SPACING.xl, color: COLORS.textMuted },
  banner: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: SPACING.sm,
  },
  bannerText: { fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.text },
  card: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  statusBar: { width: 4 },
  cardDate: { fontSize: FONT_SIZE.title, fontWeight: '600', color: COLORS.text },
  editLink: { fontSize: FONT_SIZE.caption, color: COLORS.primary, fontWeight: '600' },
  cardAddr: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  cardStatus: { fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 4 },
  confirmBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.success,
  },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});
