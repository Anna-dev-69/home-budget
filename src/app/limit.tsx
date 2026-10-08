import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProgressBar, useShake } from '@/components/anim';
import { Button, CategoryIcon, Chip, closeModal, FieldLabel, ModalScreen } from '@/components/ui';
import { categoryById, sumOf, transactionsInMonth } from '@/data/selectors';
import { useBudget } from '@/data/store';
import { progressColor, radius, useTheme } from '@/theme';
import { currentMonthKey, formatMoney, parseAmount, shiftMonth } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function LimitModal() {
  const p = useTheme();
  const { categoryId = '' } = useLocalSearchParams<{ categoryId: string }>();
  const { state, setLimit } = useBudget();
  const category = categoryById(state, categoryId);
  const current = state.limits[categoryId];
  const [amount, setAmount] = useState(current ? String(current) : '');
  const { style: shakeStyle, shake } = useShake();

  const month = currentMonthKey();
  const spent = sumOf(transactionsInMonth(state, month).filter((t) => t.categoryId === categoryId), 'expense');
  const prevSpent = sumOf(transactionsInMonth(state, shiftMonth(month, -1)).filter((t) => t.categoryId === categoryId), 'expense');
  const value = parseAmount(amount);
  const ratio = value > 0 ? spent / value : 0;
  const suggestions = [...new Set([prevSpent, prevSpent * 1.1].map((v) => Math.ceil(v / 500) * 500).filter((v) => v > 0))];

  const save = async () => {
    if (value <= 0) {
      haptics.warning();
      shake();
      return;
    }
    await setLimit(categoryId, value);
    haptics.success();
    closeModal();
  };

  return (
    <ModalScreen
      title="Лимит на месяц"
      footer={
        <>
          <Button title="Сохранить лимит" icon="checkmark" onPress={save} />
          {current ? (
            <Button
              variant="danger"
              title="Убрать лимит"
              icon="close"
              onPress={async () => {
                await setLimit(categoryId, null);
                closeModal();
              }}
            />
          ) : null}
        </>
      }
    >
      <View style={styles.head}>
        <CategoryIcon icon={category.icon} color={category.color} size={48} />
        <View>
          <Text style={{ color: p.text, fontSize: 18, fontWeight: '700' }}>{category.name}</Text>
          <Text style={{ color: p.textTertiary, fontSize: 13 }}>В этом месяце потрачено {formatMoney(spent)}</Text>
        </View>
      </View>

      <Animated.View style={[styles.amountBox, { backgroundColor: p.card }, shakeStyle]}>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ''))}
          placeholder="0"
          placeholderTextColor={p.textTertiary}
          keyboardType="number-pad"
          autoFocus
          style={[styles.amountInput, { color: p.text }]}
          onSubmitEditing={save}
        />
        <Text style={{ color: p.textSecondary, fontSize: 28, fontWeight: '700' }}>₽</Text>
      </Animated.View>

      {value > 0 && (
        <View style={{ marginTop: 14, gap: 6 }}>
          <ProgressBar ratio={ratio} color={progressColor(p, ratio)} track={p.track} height={8} />
          <Text style={{ color: p.textSecondary, fontSize: 13 }}>
            {spent > value ? `Уже превышен на ${formatMoney(spent - value)}` : `Останется ${formatMoney(value - spent)} до конца месяца`}
          </Text>
        </View>
      )}

      {suggestions.length > 0 && (
        <>
          <FieldLabel>Подсказка по прошлому месяцу</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {suggestions.map((s, i) => (
              <Chip key={s} label={`${formatMoney(s)}${i === 0 ? ' — как в прошлом' : ' — с запасом'}`} active={value === s} onPress={() => setAmount(String(s))} />
            ))}
          </View>
        </>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  amountBox: { marginTop: 18, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  amountInput: { fontSize: 40, fontWeight: '800', minWidth: 80, textAlign: 'center' },
});
