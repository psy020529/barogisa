import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Expo 푸시 알림 — 토큰 발급/등록.
// ⚠️ Android 원격 푸시는 FCM 자격증명이 EAS에 설정돼 있어야 토큰 발급·전송이 동작한다.
//    (Firebase 프로젝트 + google-services.json + FCM v1 service account → EAS credentials)
// 알림 수신 시 표시 방식
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 디바이스의 Expo push token 발급. 실패해도 앱은 계속 동작(푸시는 부가기능).
export async function registerForPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) {
      console.log('[PUSH] 권한 거부됨');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[PUSH] expo push token =', token.data);
    return token.data;
  } catch (e) {
    // FCM 미설정 등으로 실패하면 여기로 — 검증 단계에서 원인 파악용 로그
    console.warn('[PUSH] 토큰 발급 실패:', e instanceof Error ? e.message : String(e));
    return null;
  }
}
