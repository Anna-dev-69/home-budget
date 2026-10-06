import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { NATIVE_DRIVER, useAnimatedValue } from './anim';
import { useTheme } from '@/theme';
import { currentMonthKey, monthLabel, shiftMonth } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export function MonthSwitcher({
  value,
  onChange,
  max = currentMonthKey(),
  min,
}: {
  value: string;
  onChange: (key: string) => void;
  max?: string;
  min?: string;
}) {
  const p = useTheme();
  const anim = useAnimatedValue(1);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 16, bounciness: 4 }).start();
  }, [value, anim]);

  const go = (delta: number) => {
    setDirection(delta);
    haptics.tap();
    onChange(shiftMonth(value, delta));
  };
  const canNext = value < max;
  const canPrev = !min || value > min;
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [direction * 24, 0] });

  return (
    <View style={styles.root}>
      <Pressable hitSlop={10} disabled={!canPrev} onPress={() => go(-1)} style={[styles.btn, { backgroundColor: p.cardAlt, opacity: canPrev ? 1 : 0.35 }]}>
        <Ionicons name="chevron-back" size={18} color={p.text} />
      </Pressable>
      <Animated.Text style={[styles.label, { color: p.text, opacity: anim, transform: [{ translateX }] }]}>{monthLabel(value)}</Animated.Text>
      <Pressable hitSlop={10} disabled={!canNext} onPress={() => go(1)} style={[styles.btn, { backgroundColor: p.cardAlt, opacity: canNext ? 1 : 0.35 }]}>
        <Ionicons name="chevron-forward" size={18} color={p.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
