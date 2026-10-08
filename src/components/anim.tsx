import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';

export const NATIVE_DRIVER = Platform.OS !== 'web';

/** Stable Animated.Value for the component's lifetime (react-native-web has no `useAnimatedValue`). */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

/** Increments every time the screen gains focus, so entrance animations replay on each visit. */
export function useFocusKey(): number {
  const [key, setKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setKey((k) => k + 1);
    }, []),
  );
  return key;
}

/** Whether the route containing the component is currently visible. */
export function useScreenFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}

/** 0 → 1 tween restarted whenever `trigger` changes. Drives SVG charts, which can't use the native driver. */
export function useProgress(trigger: unknown, duration = 900, delay = 0, enabled = true): number {
  const [state, setState] = useState({ trigger, value: 0 });
  useEffect(() => {
    if (!enabled) return;
    const value = new Animated.Value(0);
    let lastUpdate = 0;
    const id = value.addListener(({ value: v }) => {
      const now = Date.now();
      // SVG charts require React renders. Capping them near 30 FPS avoids
      // saturating the JS thread on Android emulators while staying smooth.
      if (v < 1 && now - lastUpdate < 32) return;
      lastUpdate = now;
      setState({ trigger, value: v });
    });
    const anim = Animated.timing(value, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => {
      anim.stop();
      value.removeListener(id);
    };
  }, [trigger, duration, delay, enabled]);
  return state.trigger === trigger ? state.value : 0;
}

export function FadeIn({
  children,
  delay = 0,
  offset = 14,
  trigger,
  style,
}: {
  children: ReactNode;
  delay?: number;
  offset?: number;
  trigger?: unknown;
  style?: StyleProp<ViewStyle>;
}) {
  const value = useAnimatedValue(0);
  useEffect(() => {
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start();
  }, [trigger, delay, value]);
  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Applied to the scaled surface. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the outer pressable — use for layout such as width in a wrapping row. */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useAnimatedValue(1);
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...rest} style={containerStyle} onPressIn={(e) => (to(scaleTo), rest.onPressIn?.(e))} onPressOut={(e) => (to(1), rest.onPressOut?.(e))}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Counts from the previously shown value to the new one. */
export function AnimatedNumber({
  value,
  format,
  style,
  duration = 700,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value === 0 ? 0 : value * 0.85);
  useEffect(() => {
    const anim = new Animated.Value(from.current);
    const id = anim.addListener(({ value: v }) => setShown(v));
    const timing = Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    timing.start();
    return () => {
      timing.stop();
      anim.removeListener(id);
      from.current = value;
    };
  }, [value, duration]);
  return <Animated.Text style={style}>{format(Math.round(shown))}</Animated.Text>;
}

export function ProgressBar({
  ratio,
  color,
  track,
  height = 8,
  trigger,
}: {
  ratio: number;
  color: string;
  track: string;
  height?: number;
  trigger?: unknown;
}) {
  const value = useAnimatedValue(0);
  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (lastTrigger.current !== trigger) {
      lastTrigger.current = trigger;
      value.setValue(0);
    }
    Animated.timing(value, {
      toValue: Math.max(0, Math.min(ratio, 1)),
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, trigger, value]);
  const width = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
    </Animated.View>
  );
}

/** Horizontal shake, used to reject an invalid form submit. */
export function useShake() {
  const x = useAnimatedValue(0);
  const shake = useCallback(() => {
    const step = (toValue: number) => Animated.timing(x, { toValue, duration: 45, useNativeDriver: NATIVE_DRIVER });
    Animated.sequence([step(10), step(-10), step(8), step(-8), step(4), step(0)]).start();
  }, [x]);
  return { style: { transform: [{ translateX: x }] }, shake };
}
