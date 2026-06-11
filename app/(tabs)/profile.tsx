import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();

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
  deleteText: {
    marginTop: SPACING.lg,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    textDecorationLine: 'underline',
  },
});
