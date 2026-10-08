import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FadeIn, PressableScale, useShake } from '@/components/anim';
import { Segmented } from '@/components/Segmented';
import { Button, CategoryIcon, Chip, closeModal, FieldLabel, ModalScreen } from '@/components/ui';
import { useBudget } from '@/data/store';
import type { TxType } from '@/data/types';
import { radius, useTheme } from '@/theme';
import { dayHeader, formatNumber, parseAmount, shiftDate, todayISO } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function TransactionModal() {
  const p = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addTransaction, updateTransaction, deleteTransaction } = useBudget();
  const existing = id ? state.transactions.find((t) => t.id === id) : undefined;
  const lastTx = state.transactions.reduce<(typeof state.transactions)[number] | undefined>(
    (latest, t) => (!latest || t.createdAt > latest.createdAt ? t : latest),
    undefined,
  );

  const [type, setType] = useState<TxType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? formatNumber(existing.amount).replace(/\u00A0/g, '') : '');
  const firstCategory = (t: TxType) => state.categories.find((c) => c.type === t)?.id ?? '';
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? (lastTx?.type === 'expense' ? lastTx.categoryId : firstCategory('expense')),
  );
  const [accountId, setAccountId] = useState(existing?.accountId ?? lastTx?.accountId ?? state.accounts[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { style: shakeStyle, shake } = useShake();

  const categories = state.categories.filter((c) => c.type === type);
  const value = parseAmount(amount);
  const today = todayISO();

  const switchType = (t: TxType) => {
    setType(t);
    if (!state.categories.some((c) => c.id === categoryId && c.type === t)) setCategoryId(firstCategory(t));
  };

  const save = async () => {
    if (value <= 0) {
      haptics.warning();
      shake();
      return;
    }
    const payload = { type, amount: value, categoryId, accountId, date, note: note.trim() };
    if (existing) await updateTransaction({ ...existing, ...payload });
    else await addTransaction(payload);
    haptics.success();
    closeModal();
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirmDelete) {
      haptics.warning();
      setConfirmDelete(true);
      return;
    }
    await deleteTransaction(existing.id);
    haptics.success();
    closeModal();
  };

  if (id && !existing) {
    return (
      <ModalScreen title="Операция">
        <Text style={{ color: p.textSecondary }}>Операция не найдена — возможно, она уже удалена.</Text>
      </ModalScreen>
    );
  }

  if (!state.accounts.length) {
    return (
      <ModalScreen title="Новая операция">
        <View style={{ gap: 14 }}>
          <Text style={{ color: p.textSecondary, fontSize: 15 }}>
            Сначала добавьте хотя бы один счёт. Его начальный остаток станет отправной точкой для точного баланса.
          </Text>
          <Button title="Добавить счёт" icon="add" onPress={() => router.replace('/account')} />
        </View>
      </ModalScreen>
    );
  }

  return (
    <ModalScreen
      title={existing ? 'Редактирование' : 'Новая операция'}
      footer={
        <>
          <Button title={existing ? 'Сохранить изменения' : 'Добавить'} icon="checkmark" onPress={save} />
          {existing ? (
            <Button variant="danger" icon="trash-outline" title={confirmDelete ? 'Нажмите ещё раз для удаления' : 'Удалить операцию'} onPress={remove} />
          ) : null}
        </>
      }
    >
      <Segmented<TxType>
        value={type}
        onChange={switchType}
        options={[
          { value: 'expense', label: 'Расход' },
          { value: 'income', label: 'Доход' },
        ]}
      />

      <Animated.View style={[styles.amountBox, { backgroundColor: p.card }, shakeStyle]}>
        <Text style={{ color: p.textTertiary, fontSize: 13 }}>Сумма</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountSign, { color: type === 'income' ? p.success : p.textSecondary }]}>{type === 'income' ? '+' : '−'}</Text>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d.,]/g, '').replace(/([.,].{0,2}).*$/, '$1'))}
            placeholder="0"
            placeholderTextColor={p.textTertiary}
            keyboardType="decimal-pad"
            autoFocus={!existing}
            style={[styles.amountInput, { color: type === 'income' ? p.success : p.text }]}
            onSubmitEditing={save}
          />
          <Text style={[styles.amountSign, { color: p.textSecondary }]}>₽</Text>
        </View>
      </Animated.View>

      <FieldLabel>Категория</FieldLabel>
      <FadeIn trigger={type} offset={8}>
        <View style={styles.grid}>
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <PressableScale
                key={c.id}
                scaleTo={0.9}
                onPress={() => {
                  haptics.tap();
                  setCategoryId(c.id);
                }}
                containerStyle={styles.catSlot}
                style={[styles.cat, { backgroundColor: active ? c.color + '1F' : p.card, borderColor: active ? c.color : 'transparent' }]}
              >
                <CategoryIcon icon={c.icon} color={c.color} size={36} />
                <Text numberOfLines={1} style={{ color: active ? p.text : p.textSecondary, fontSize: 11, fontWeight: active ? '700' : '500' }}>
                  {c.name}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </FadeIn>

      <FieldLabel>Счёт</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {state.accounts.map((a) => (
          <Chip key={a.id} label={a.name} icon={a.icon} active={a.id === accountId} onPress={() => setAccountId(a.id)} />
        ))}
      </ScrollView>

      <FieldLabel>Дата</FieldLabel>
      <View style={[styles.dateRow, { backgroundColor: p.card }]}>
        <Pressable hitSlop={8} onPress={() => setDate(shiftDate(date, -1))} style={[styles.dateBtn, { backgroundColor: p.cardAlt }]}>
          <Ionicons name="chevron-back" size={18} color={p.text} />
        </Pressable>
        <Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{dayHeader(date)}</Text>
        <Pressable
          hitSlop={8}
          disabled={date >= today}
          onPress={() => setDate(shiftDate(date, 1))}
          style={[styles.dateBtn, { backgroundColor: p.cardAlt, opacity: date >= today ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={p.text} />
        </Pressable>
      </View>

      <FieldLabel>Комментарий</FieldLabel>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Например, «Пятёрочка»"
        placeholderTextColor={p.textTertiary}
        style={[styles.note, { backgroundColor: p.card, color: p.text }]}
        maxLength={60}
      />
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  amountBox: { marginTop: 16, borderRadius: radius.lg, padding: 16, alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  amountSign: { fontSize: 30, fontWeight: '700' },
  amountInput: { fontSize: 40, fontWeight: '800', minWidth: 60, textAlign: 'center', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catSlot: { width: '22.5%' },
  cat: { alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: radius.md, borderWidth: 1.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, padding: 8 },
  dateBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontSize: 15 },
});
