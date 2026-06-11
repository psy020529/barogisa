import { Tabs } from 'expo-router';
import { COLORS } from '@/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tabs.Screen name="calendar" options={{ title: '캘린더' }} />
      <Tabs.Screen name="find" options={{ title: '일감 찾기' }} />
      <Tabs.Screen name="settlement" options={{ title: '정산' }} />
      <Tabs.Screen name="profile" options={{ title: '내 정보' }} />
    </Tabs>
  );
}
