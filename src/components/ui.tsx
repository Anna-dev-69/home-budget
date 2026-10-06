import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from './anim';
import type { IconName } from '@/data/types';
import { radius, useTheme } from '@/theme';

export function Screen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {subtitle ? <Text style={[styles.subtitle, { color: p.textTertiary }]}>{subtitle}</Text> : null}
            <Text style={[styles.title, { color: p.text }]}>{title}</Text>
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function closeModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ModalScreen({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 10 }]}>
        <Text style={[styles.modalTitle, { color: p.text }]}>{title}</Text>
        <Pressable hitSlop={12} onPress={closeModal} style={[styles.close, { backgroundColor: p.cardAlt }]} accessibilityLabel="Закрыть">
          <Ionicons name="close" size={20} color={p.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 14), gap: 10 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function FieldLabel({ children }: { children: string }) {
  const p = useTheme();
  return <Text style={[styles.fieldLabel, { color: p.textTertiary }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = useTheme();
  return <View style={[{ backgroundColor: p.card, borderRadius: radius.lg, padding: 16 }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>{title}</Text>
      {action ? (
        <Text onPress={onAction} style={[styles.sectionAction, { color: p.accent }]} suppressHighlighting>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function CategoryIcon({ icon, color, size = 38 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useTheme();
  const bg = variant === 'primary' ? p.accent : variant === 'danger' ? p.danger + '1A' : p.cardAlt;
  const fg = variant === 'primary' ? p.onAccent : variant === 'danger' ? p.danger : p.text;
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: IconName }) {
  const p = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? p.accentSoft : p.cardAlt, borderColor: active ? p.accent : 'transparent' }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? p.accent : p.textSecondary} /> : null}
      <Text style={{ color: active ? p.accent : p.textSecondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </PressableScale>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const p = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Ionicons name={icon} size={32} color={p.textTertiary} />
      <Text style={{ color: p.textTertiary, fontSize: 14, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 13, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '700' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionAction: { fontSize: 14, fontWeight: '600' },
  button: { height: 50, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
});
