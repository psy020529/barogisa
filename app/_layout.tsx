import { initializeKakaoSDK } from '@react-native-kakao/core';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';

// 카카오 네이티브 SDK 초기화 (앱 시작 시 1회). Native app key는 app.json의
// extra.kakaoNativeAppKey 에서 읽는다. 키가 없으면 카카오 로그인 시도 시 에러로 드러난다.
const kakaoNativeAppKey = Constants.expoConfig?.extra?.kakaoNativeAppKey as string | undefined;
if (kakaoNativeAppKey) {
  initializeKakaoSDK(kakaoNativeAppKey);
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="factory" />
          <Stack.Screen name="job" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
