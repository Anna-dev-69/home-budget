import Tabs from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const p = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: p.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="operations" options={{ title: 'Операции' }} />
      <Tabs.Screen name="add" options={{ title: 'Добавить' }} />
      <Tabs.Screen name="stats" options={{ title: 'Статистика' }} />
      <Tabs.Screen name="budget" options={{ title: 'Бюджет' }} />
    </Tabs>
  );
}
