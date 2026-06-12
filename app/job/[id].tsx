import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, LONG_DISTANCE_SURCHARGE, PROCESS_LABEL, RADIUS, SPACING, STATUS_LABEL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDriverJobs, useJob, useMyApplications } from '@/hooks/useJobs';
import { applyToJob, updateJobStatus } from '@/services/jobsApi';
import { travelFromAddress, type Travel } from '@/services/naver';
import { formatCurrency } from '@/utils/format';

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const job = useJob(id);
  const allJobs = useDriverJobs(user?.id);
  const myApps = useMyApplications(user?.id);
  const [applying, setApplying] = useState(false);
  const [travel, setTravel] = useState<Travel | null>(null);

  // 내 출발지(프로필) → 현장 거리 — 지원/수락 판단 정보 (장거리 판정은 기사 기준)
  const startLat = user?.driverProfile?.startLat;
  const startLon = user?.driverProfile?.startLon;
  useEffect(() => {
    if (!job?.address || startLat == null || startLon == null) return;
    let cancelled = false;
    travelFromAddress({ lat: startLat, lon: startLon }, job.address)
      .then((t) => { if (!cancelled) setTravel(t); })
      .catch((e) => console.warn('travel calc failed:', e));
    return () => {
      cancelled = true;
    };
  }, [job?.address, startLat, startLon]);

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>일감을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const sameDayConfirmed = allJobs.some(
    (j) => j.id !== job.id && j.date === job.date && (j.status === 'confirmed' || j.status === 'accepted' || j.status === 'checked_in'),
  );

  // 공개 모집 건: 모집 중 + 내가 아직 배정 안 된 상태면 지원 가능
  const isOpenRecruiting = job.listingType === 'open' && !job.driverId && job.status === 'requested';
  const myApplication = myApps.find((a) => a.jobId === job.id);
  // 지명 발주 건의 수락/거절은 지명된 본인에게만
  const isMyDirectRequest =
    job.listingType === 'direct' && job.driverId === user?.id && job.status === 'requested';
  const isMyJob = job.driverId === user?.id;

  const doApply = async () => {
    if (!user) return;
    setApplying(true);
    try {
      await applyToJob(job.id, user.id);
      Alert.alert('지원 완료', '공장이 선택하면 알려드립니다.');
    } catch (e) {
      Alert.alert('지원 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  };

  const apply = () => {
    if (sameDayConfirmed) {
      Alert.alert(
        '일정 충돌',
        `${job.date}에 이미 다른 일감이 잡혀 있습니다. 그래도 지원하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '지원', onPress: doApply },
        ],
      );
      return;
    }
    doApply();
  };

  const doUpdate = async (status: 'accepted' | 'rejected') => {
    try {
      await updateJobStatus(job.id, status);
      router.back();
    } catch (e) {
      Alert.alert('처리 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const accept = () => {
    if (sameDayConfirmed) {
      Alert.alert(
        '일정 충돌',
        `${job.date}에 이미 다른 일감이 잡혀 있습니다. 정말 수락하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '수락', onPress: () => doUpdate('accepted') },
        ],
      );
      return;
    }
    doUpdate('accepted');
  };

  const reject = () => {
    Alert.alert('거절 확인', '이 일감을 거절하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '거절', style: 'destructive', onPress: () => doUpdate('rejected') },
    ]);
  };

  const goCheckin = (type: 'in' | 'out') => {
    router.push(`/job/checkin?jobId=${job.id}&type=${type}`);
  };

  // 상태별 "지금 할 일" 안내 — 사용자가 무엇을 눌러야 하는지 한 줄로
  const guide = (() => {
    if (isOpenRecruiting && !myApplication) return '👇 마음에 들면 아래 [지원하기]를 누르세요';
    if (isOpenRecruiting && myApplication?.status === 'pending')
      return '⏳ 지원 완료 — 공장이 선택할 때까지 기다리시면 됩니다';
    if (myApplication?.status === 'rejected') return '다른 기사로 확정된 일감입니다';
    if (isMyDirectRequest) return '👇 아래에서 [수락] 또는 [거절]을 선택하세요';
    if (isMyJob && job.status === 'accepted') return '⏳ 공장 확정 대기 — 따로 할 일이 없습니다';
    if (isMyJob && job.status === 'confirmed') return '📍 현장에 도착하면 [체크인]을 누르세요';
    if (isMyJob && job.status === 'checked_in') return '🔧 작업이 끝나면 [체크아웃]을 누르세요';
    if (isMyJob && job.status === 'completed') return '💰 수금 확인은 [정산] 탭에서 할 수 있습니다';
    if (isMyJob && job.status === 'paid') return '✅ 수금까지 완료된 거래입니다';
    return null;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 닫기</Text>
        </Pressable>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {isOpenRecruiting ? '공개 모집 중' : STATUS_LABEL[job.status]}
          </Text>
        </View>

        {guide && (
          <View style={styles.guideBox}>
            <Text style={styles.guideText}>{guide}</Text>
          </View>
        )}

        <Text style={styles.factory}>{job.factoryName}</Text>
        <Text style={styles.process}>{PROCESS_LABEL[job.process]}</Text>

        <View style={styles.divider} />

        <InfoRow label="시공 날짜" value={job.date} />
        <InfoRow label="주소" value={job.address} />
        <InfoRow label="단가" value={formatCurrency(job.amount)} />
        {travel && (
          <InfoRow
            label="내 출발지에서"
            value={`약 ${travel.km}km · 차로 ${travel.minutes}분${
              travel.longDistance
                ? ` · 장거리 (+${LONG_DISTANCE_SURCHARGE.toLocaleString()}원 협의)`
                : ''
            }`}
          />
        )}
        {!travel && user?.role === 'driver' && !user?.driverProfile?.startAddress && (
          <Text style={styles.travelHint}>
            프로필에서 출발지를 등록하면 현장까지 거리·장거리 여부를 보여드립니다
          </Text>
        )}
        {job.notes && <InfoRow label="비고" value={job.notes} />}

        {sameDayConfirmed && job.status === 'requested' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠ 같은 날짜에 이미 다른 일감이 있습니다</Text>
          </View>
        )}

        <View style={styles.actions}>
          {/* 공개 모집: 지원하기 / 지원 상태 */}
          {isOpenRecruiting && !myApplication && (
            <Pressable
              style={[styles.btn, styles.btnPrimary, { flex: 1 }, applying && { opacity: 0.6 }]}
              onPress={apply}
              disabled={applying}
            >
              <Text style={styles.btnText}>{applying ? '지원 중...' : '이 일감에 지원하기'}</Text>
            </Pressable>
          )}
          {isOpenRecruiting && myApplication?.status === 'pending' && (
            <Text style={styles.hint}>지원 완료 — 공장의 선택을 기다리는 중입니다.</Text>
          )}
          {myApplication?.status === 'rejected' && (
            <Text style={styles.hint}>이 일감은 다른 기사로 확정되었습니다.</Text>
          )}

          {/* 지명 발주: 지명된 본인만 수락/거절 */}
          {isMyDirectRequest && (
            <>
              <Pressable style={[styles.btn, styles.btnDanger]} onPress={reject}>
                <Text style={styles.btnText}>거절</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={accept}>
                <Text style={styles.btnText}>수락</Text>
              </Pressable>
            </>
          )}
          {isMyJob && job.status === 'accepted' && (
            <Text style={styles.hint}>공장의 최종 확인을 기다리는 중입니다.</Text>
          )}
          {isMyJob && job.status === 'confirmed' && (
            <Pressable style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={() => goCheckin('in')}>
              <Text style={styles.btnText}>체크인 (시공 시작)</Text>
            </Pressable>
          )}
          {isMyJob && job.status === 'checked_in' && (
            <Pressable style={[styles.btn, styles.btnSuccess, { flex: 1 }]} onPress={() => goCheckin('out')}>
              <Text style={styles.btnText}>체크아웃 (시공 완료)</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { padding: SPACING.xl, color: COLORS.textMuted },
  backButton: { paddingVertical: SPACING.sm },
  backText: { fontSize: FONT_SIZE.body, color: COLORS.primary },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    marginTop: SPACING.sm,
  },
  statusBadgeText: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  guideBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  guideText: { fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.text },
  factory: { marginTop: SPACING.md, fontSize: FONT_SIZE.display, fontWeight: '700', color: COLORS.text },
  process: { marginTop: 4, fontSize: FONT_SIZE.title, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  infoRow: { flexDirection: 'row', paddingVertical: SPACING.sm },
  infoLabel: { width: 100, fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  infoValue: { flex: 1, fontSize: FONT_SIZE.body, color: COLORS.text },
  travelHint: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textLight,
    paddingVertical: SPACING.sm,
  },
  warningBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF4E5',
  },
  warningText: { color: COLORS.warning, fontSize: FONT_SIZE.body, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  btn: { flex: 1, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDanger: { backgroundColor: COLORS.danger },
  btnSuccess: { backgroundColor: COLORS.success },
  btnText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '600' },
  hint: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZE.body, paddingVertical: SPACING.md },
});
