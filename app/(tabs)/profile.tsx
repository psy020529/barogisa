import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 정보</Text>
      <Text style={styles.row}>이름: {user?.name ?? '-'}</Text>
      <Text style={styles.row}>역할: {user?.role ?? '-'}</Text>
      <Text style={styles.row}>전화: {user?.phone ?? '-'}</Text>

      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.xl, gap: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  row: { fontSize: FONT_SIZE.body, color: COLORS.text },
  button: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '600' },
});
