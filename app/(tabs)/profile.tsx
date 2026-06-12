import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DaumPostcode from '@/components/DaumPostcode';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { searchAddress } from '@/services/naver';
import type { DriverJobType } from '@/types';

// 베타 직군: 시공·재단·조립만 (청소/수전/용달은 추후)
const JOB_TYPES: DriverJobType[] = ['installation', 'cutting', 'assembly'];

export default function ProfileScreen() {
  const { user, signOut, deleteAccount, updateDriverJobType, updateStartLocation } = useAuth();

  // 출발지 선택 → 좌표 변환 → 저장 (장거리 판정 기준점)
  const changeStartLocation = async (roadAddress: string) => {
    try {
      const found = await searchAddress(roadAddress);
      if (found.length === 0) throw new Error('주소의 좌표를 찾을 수 없습니다');
      await updateStartLocation(roadAddress, found[0].lat, found[0].lon);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const changeJobType = async (jobType: DriverJobType) => {
    if (jobType === user?.driverProfile?.jobType) return;
    try {
      await updateDriverJobType(jobType);
    } catch (e) {
      Alert.alert('변경 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    Alert.alert('회원 탈퇴', '계정과 모든 데이터가 삭제됩니다.\n정말 탈퇴하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            router.replace('/');
          } catch (e) {
            Alert.alert('탈퇴 실패', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 정보</Text>
      <Text style={styles.row}>이름: {user?.name ?? '-'}</Text>
      <Text style={styles.row}>역할: {user?.role ?? '-'}</Text>
      <Text style={styles.row}>전화: {user?.phone ?? '-'}</Text>
      {user?.isAdmin && <Text style={[styles.row, { color: COLORS.primary }]}>관리자 권한</Text>}

      {user?.role === 'driver' && (
        <View style={styles.jobTypeBox}>
          <Text style={styles.jobTypeLabel}>출발지 (장거리 판정 기준)</Text>
          <DaumPostcode
            value={user?.driverProfile?.startAddress ?? ''}
            placeholder="출발지 주소 검색"
            onComplete={(r) => changeStartLocation(r.roadAddress)}
          />
        </View>
      )}

      {user?.role === 'driver' && (
        <View style={styles.jobTypeBox}>
          <Text style={styles.jobTypeLabel}>내 직군 (일감 추천 기준)</Text>
          <View style={styles.jobTypeRow}>
            {JOB_TYPES.map((t) => {
              const active = user?.driverProfile?.jobType === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.jobTypeChip, active && styles.jobTypeChipActive]}
                  onPress={() => changeJobType(t)}
                >
                  <Text style={[styles.jobTypeChipText, active && styles.jobTypeChipTextActive]}>
                    {PROCESS_LABEL[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {user?.isAdmin && (
        <Pressable
          style={[styles.button, { backgroundColor: COLORS.primary }]}
          onPress={() => router.push('/factory')}
        >
          <Text style={styles.buttonText}>공장 화면 열기</Text>
        </Pressable>
      )}

      <Pressable style={[styles.button, { backgroundColor: COLORS.danger }]} onPress={handleSignOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>

      <Pressable onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>회원 탈퇴</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.xl, gap: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  row: { fontSize: FONT_SIZE.body, color: COLORS.text },
  button: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '600' },
  jobTypeBox: { marginTop: SPACING.md },
  jobTypeLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  jobTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  jobTypeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  jobTypeChipText: { fontSize: FONT_SIZE.body, color: COLORS.text },
  jobTypeChipTextActive: { color: '#fff', fontWeight: '600' },
  deleteText: {
    marginTop: SPACING.lg,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    textDecorationLine: 'underline',
  },
});
