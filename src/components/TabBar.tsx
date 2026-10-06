import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type Tabs from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { NATIVE_DRIVER, PressableScale, useAnimatedValue } from './anim';
import type { IconName } from '@/data/types';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'],
  operations: ['list-outline', 'list'],
  stats: ['pie-chart-outline', 'pie-chart'],
  budget: ['wallet-outline', 'wallet'],
};

export const ADD_ROUTE = 'add';

function TabItem({ focused, label, routeName, onPress }: { focused: boolean; label: string; routeName: string; onPress: () => void }) {
  const p = useTheme();
  const scale = useAnimatedValue(focused ? 1 : 0);
  useEffect(() => {
    Animated.spring(scale, { toValue: focused ? 1 : 0, useNativeDriver: NATIVE_DRIVER, speed: 20, bounciness: 10 }).start();
  }, [focused, scale]);
  const [outline, filled] = ICONS[routeName] ?? ['ellipse-outline', 'ellipse'];
  const color = focused ? p.accent : p.textTertiary;
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
      <Animated.View style={{ transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }, { translateY: scale.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>
        <Ionicons name={focused ? filled : outline} size={23} color={color} />
      </Animated.View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const p = useTheme();
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const x = useAnimatedValue(0);
  const activeIsAdd = state.routes[state.index]?.name === ADD_ROUTE;

  useEffect(() => {
    if (!activeIsAdd) Animated.spring(x, { toValue: state.index * slot, useNativeDriver: NATIVE_DRIVER, speed: 16, bounciness: 8 }).start();
  }, [state.index, slot, x, activeIsAdd]);

  return (
    <View
      style={[styles.bar, { backgroundColor: p.tabBar, borderTopColor: p.border, paddingBottom: Math.max(insets.bottom, 10) }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Animated.View style={[styles.indicator, { width: slot, transform: [{ translateX: x }] }]}>
          <View style={[styles.indicatorPill, { backgroundColor: p.accentSoft }]} />
        </Animated.View>
      )}
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
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
  indicator: { position: 'absolute', top: 4, height: 50, alignItems: 'center' },
  indicatorPill: { width: 64, height: 50, borderRadius: 16 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: -24 },
});
