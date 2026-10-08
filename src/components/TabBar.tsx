import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type Tabs from 'expo-router/js-tabs';
import { useEffect, type ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { NATIVE_DRIVER, PressableScale, useAnimatedValue } from './anim';
import type { IconName } from '@/data/types';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, IconName> = {
  index: 'home-outline',
  operations: 'list-outline',
  stats: 'bar-chart-outline',
  budget: 'wallet-outline',
};

export const ADD_ROUTE = 'add';

function TabItem({ focused, label, routeName, onPress }: { focused: boolean; label: string; routeName: string; onPress: () => void }) {
  const p = useTheme();
  const scale = useAnimatedValue(focused ? 1 : 0);
  useEffect(() => {
    Animated.spring(scale, { toValue: focused ? 1 : 0, useNativeDriver: NATIVE_DRIVER, speed: 20, bounciness: 10 }).start();
  }, [focused, scale]);
  const icon = ICONS[routeName] ?? 'ellipse-outline';
  const color = focused ? p.accent : p.textTertiary;
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
      <Animated.View style={{ transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }, { translateY: scale.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>
        <Ionicons name={icon} size={23} color={color} />
      </Animated.View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const p = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: p.tabBar, borderTopColor: p.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        if (route.name === ADD_ROUTE) {
          return (
            <View key={route.key} style={styles.item}>
              <PressableScale
                scaleTo={0.88}
                accessibilityLabel="Добавить операцию"
                onPress={() => {
                  haptics.impact();
                  router.push('/transaction');
                }}
                style={[styles.fab, { backgroundColor: p.accent }]}
              >
                <Ionicons name="add" size={30} color={p.onAccent} />
              </PressableScale>
            </View>
          );
        }
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.tap();
            navigation.navigate(route.name, route.params);
          }
        };
        return <TabItem key={route.key} focused={focused} label={label} routeName={route.name} onPress={onPress} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
  fab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
