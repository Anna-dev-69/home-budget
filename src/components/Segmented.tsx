import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { NATIVE_DRIVER, useAnimatedValue } from './anim';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const p = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useAnimatedValue(0);
  const segment = width / options.length;

  useEffect(() => {
    Animated.spring(x, { toValue: index * segment, useNativeDriver: NATIVE_DRIVER, speed: 18, bounciness: 6 }).start();
  }, [index, segment, x]);

  return (
    <View style={[styles.root, { backgroundColor: p.cardAlt }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 6)}>
      {width > 0 && (
        <Animated.View style={[styles.thumb, { width: segment, backgroundColor: p.card, transform: [{ translateX: x }] }]} />
      )}
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={styles.item}
          onPress={() => {
            if (o.value !== value) haptics.tap();
            onChange(o.value);
          }}
        >
          <Text style={[styles.label, { color: o.value === value ? p.text : p.textSecondary }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  thumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 10 },
  item: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
});
