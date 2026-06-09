import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

/**
 * Kakao OAuth 딥링크 콜백 안전망 라우트.
 *
 * 앱이 죽은 상태에서 브라우저가 barogisa://auth/callback?code=... 로 앱을 다시
 * 띄우는 cold start 경로에서, expo-router가 이 라우트로 진입한다. useAuth의 딥링크
 * 핸들러가 code를 교환해 세션을 수립하는 동안 잠깐 스피너를 보여주고, 처리가 끝나면
 * index 라우팅 로직(역할별 분기)으로 위임한다. 이 라우트가 없으면 cold start 시
 * "unmatched route(not-found)" 화면이 깜빡일 수 있다.
 */
export default function AuthCallback() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href="/" />;
}
