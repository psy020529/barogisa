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

  // authenticated
  if (user?.role === 'driver') return <Redirect href="/(tabs)/calendar" />;
  if (user?.role === 'factory') return <Redirect href="/factory" />;
  return null;
}
