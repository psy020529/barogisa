import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />;
  if (status === 'needs-onboarding') return <Redirect href="/(auth)/onboarding" />;

  // 장부 앱(피벗): 단일 역할(팀장) — 모두 캘린더로. (매칭/공장화면은 Phase 2)
  void user;
  return <Redirect href="/(tabs)/calendar" />;
}
