import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, LONG_DISTANCE_SURCHARGE, PROCESS_LABEL, RADIUS, SPACING } from '@/constants';
import { useApplicants, useJob } from '@/hooks/useJobs';
import { selectApplicant } from '@/services/jobsApi';
import { formatCurrencyShort } from '@/utils/format';

// 공개 모집 일감의 지원자 목록 — 공장이 선택하면 확정 + 나머지 자동 거절
export default function Applicants() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId);
  const applicants = useApplicants(jobId);
  const [busy, setBusy] = useState(false);

  const pending = applicants.filter((a) => a.status === 'pending');
  const selected = applicants.find((a) => a.status === 'selected');

  const choose = (applicationId: string, name: string) => {
    Alert.alert('기사 선택', `${name} 기사로 확정합니까?\n다른 지원자는 자동 거절됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '확정',
        onPress: async () => {
          setBusy(true);
          try {
            await selectApplicant(applicationId);
            Alert.alert('확정 완료', `${name} 기사로 확정했습니다.`, [
              { text: '확인', onPress: () => router.back() },
            ]);
          } catch (e) {
            Alert.alert('처리 실패', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← 닫기</Text>
        </Pressable>
        <Text style={styles.title}>지원자 선택</Text>
        {job && (
          <Text style={styles.subtitle}>
            {job.date} · {PROCESS_LABEL[job.process]} · {formatCurrencyShort(job.amount)}원
          </Text>
        )}

        {selected && (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>
              ✓ {selected.driverName ?? '기사'} 님으로 확정된 일감입니다
            </Text>
          </View>
        )}

        {!selected && pending.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>아직 지원자가 없습니다.</Text>
            <Text style={styles.emptySub}>기사가 지원하면 여기에 표시됩니다.</Text>
          </View>
        )}

        {!selected &&
          pending.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{a.driverName ?? '이름 없음'}</Text>
                <Text style={styles.cardTime}>
                  {new Date(a.createdAt).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  지원
                </Text>
                {a.travelKm != null && (
                  <Text style={[styles.cardTravel, a.longDistance && { color: COLORS.warning }]}>
                    출발지에서 {a.travelKm}km · {a.travelMinutes}분
                    {a.longDistance &&
                      ` · 장거리 (선택 시 +${LONG_DISTANCE_SURCHARGE.toLocaleString()}원)`}
                  </Text>
                )}
              </View>
              <Pressable
                style={[styles.chooseBtn, busy && { opacity: 0.6 }]}
                onPress={() => choose(a.id, a.driverName ?? '이름 없음')}
                disabled={busy}
              >
                <Text style={styles.chooseBtnText}>선택</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backText: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  subtitle: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.lg },
  doneBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successSurface,
    marginBottom: SPACING.md,
  },
  doneText: { color: COLORS.success, fontWeight: '600' },
  emptyBox: { alignItems: 'center', padding: SPACING.xxl },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  emptySub: { fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: SPACING.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardName: { fontSize: FONT_SIZE.title, fontWeight: '600', color: COLORS.text },
  cardTime: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  cardTravel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  chooseBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  chooseBtnText: { color: '#fff', fontWeight: '700' },
});
