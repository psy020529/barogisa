import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DaumPostcode from '@/components/DaumPostcode';
import { COLORS, FONT_SIZE, FONT_WEIGHT, HIT_SLOP, PROCESS_LABEL, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { searchAddress } from '@/services/naver';
import type { DriverJobType } from '@/types';

// 베타 직군: 시공·재단·조립만 (청소/수전/용달은 추후)
const JOB_TYPES: DriverJobType[] = ['installation', 'cutting', 'assembly'];

export default function ProfileScreen() {
  const { user, signOut, deleteAccount, updateDriverJobType, updateStartLocation } = useAuth();
  const isDriver = user?.role === 'driver';
  const roleLabel = user?.role === 'driver' ? '시공기사' : user?.role === 'factory' ? '공장' : '-';

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxl }}>
        {/* 헤더 — 아바타 + 이름 + 역할 */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0] ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name ?? '-'}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
              {user?.isAdmin && (
                <View style={[styles.roleBadge, styles.adminBadge]}>
                  <Text style={[styles.roleBadgeText, styles.adminBadgeText]}>관리자</Text>
                </View>
              )}
            </View>
            <Text style={styles.phone}>{user?.phone || '연락처 미등록'}</Text>
          </View>
        </View>

        {/* 기사 설정 */}
        {isDriver && (
          <>
            <Text style={styles.sectionTitle}>일감 설정</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>출발지</Text>
              <Text style={styles.fieldHint}>장거리 판정의 기준점이 됩니다</Text>
              <DaumPostcode
                value={user?.driverProfile?.startAddress ?? ''}
                placeholder="출발지 주소 검색"
                onComplete={(r) => changeStartLocation(r.roadAddress)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>내 직군</Text>
              <Text style={styles.fieldHint}>이 직군의 공개 일감을 추천받습니다</Text>
              <View style={styles.chipRow}>
                {JOB_TYPES.map((t) => {
                  const active = user?.driverProfile?.jobType === t;
                  return (
                    <Pressable
                      key={t}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => changeJobType(t)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{PROCESS_LABEL[t]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* 계정 */}
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.listCard}>
          {user?.isAdmin && (
            <Row icon="business-outline" label="공장 화면 열기" onPress={() => router.push('/factory')} chevron />
          )}
          <Row icon="log-out-outline" label="로그아웃" onPress={handleSignOut} danger last={!user?.isAdmin} />
        </View>

        <Pressable hitSlop={HIT_SLOP} onPress={handleDeleteAccount} style={styles.deleteWrap}>
          <Text style={styles.deleteText}>회원 탈퇴</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  onPress,
  chevron,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  chevron?: boolean;
  danger?: boolean;
  last?: boolean;
}) {
  const color = danger ? COLORS.danger : COLORS.text;
  return (
    <Pressable style={[styles.row, !last && styles.rowDivider]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {chevron && <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  name: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  roleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface },
  roleBadgeText: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.semibold },
  adminBadge: { backgroundColor: COLORS.primarySurface },
  adminBadgeText: { color: COLORS.primary },
  phone: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },

  sectionTitle: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  fieldLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  fieldHint: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.body, color: COLORS.text },
  chipTextActive: { color: COLORS.textInverse, fontWeight: FONT_WEIGHT.semibold },

  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.medium },

  deleteWrap: { alignSelf: 'center', marginTop: SPACING.xl },
  deleteText: { color: COLORS.textLight, fontSize: FONT_SIZE.caption, textDecorationLine: 'underline' },
});
