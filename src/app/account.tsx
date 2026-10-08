import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale, useShake } from '@/components/anim';
import { Button, closeModal, FieldLabel, ModalScreen } from '@/components/ui';
import { accountBalance } from '@/data/selectors';
import { useBudget } from '@/data/store';
import type { IconName } from '@/data/types';
import { radius, useTheme } from '@/theme';
import { formatMoney, formatNumber, parseAmount } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const ICONS: IconName[] = ['card-outline', 'wallet-outline', 'cash-outline', 'business-outline', 'phone-portrait-outline'];

export default function AccountModal() {
  const p = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addAccount, updateAccount, deleteAccount } = useBudget();
  const existing = id ? state.accounts.find((account) => account.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [initial, setInitial] = useState(existing ? formatNumber(existing.initial).replace(/\u00A0/g, '') : '');
  const [icon, setIcon] = useState<IconName>(existing?.icon ?? 'card-outline');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const { style: shakeStyle, shake } = useShake();
  const initialValue = parseAmount(initial);

  const save = async () => {
    if (!name.trim()) {
      haptics.warning();
      shake();
      return;
    }
    if (existing) {
      await updateAccount({ ...existing, name: name.trim(), icon, initial: initialValue });
    } else {
      await addAccount({ name: name.trim(), icon, initial: initialValue });
    }
    haptics.success();
    closeModal();
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      haptics.warning();
      return;
    }
    try {
      await deleteAccount(existing.id);
      haptics.success();
      closeModal();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить счёт.');
      setConfirmDelete(false);
      haptics.warning();
    }
  };

  return (
    <ModalScreen
      title={existing ? 'Редактирование счёта' : 'Новый счёт'}
      footer={
        <>
          <Button title={existing ? 'Сохранить' : 'Добавить счёт'} icon="checkmark" onPress={save} />
          {existing ? (
            <Button
              variant="danger"
              icon="trash-outline"
              title={confirmDelete ? 'Нажмите ещё раз для удаления' : 'Удалить счёт'}
              onPress={remove}
            />
          ) : null}
        </>
      }
    >
      {existing ? (
        <View style={[styles.current, { backgroundColor: p.accentSoft }]}>
          <Text style={{ color: p.textSecondary, fontSize: 13 }}>Текущий остаток с учётом операций</Text>
          <Text style={{ color: p.text, fontSize: 24, fontWeight: '800' }}>{formatMoney(accountBalance(state, existing.id))}</Text>
        </View>
      ) : null}

      <Animated.View style={shakeStyle}>
        <FieldLabel>Название</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например, «Основная карта»"
          placeholderTextColor={p.textTertiary}
          autoFocus
          maxLength={40}
          style={[styles.input, { backgroundColor: p.card, color: p.text }]}
        />
      </Animated.View>

      <FieldLabel>Тип счёта</FieldLabel>
      <View style={styles.icons}>
        {ICONS.map((item) => (
          <PressableScale
            key={item}
            onPress={() => setIcon(item)}
            style={[
              styles.icon,
              {
                backgroundColor: item === icon ? p.accentSoft : p.card,
                borderColor: item === icon ? p.accent : 'transparent',
              },
            ]}
          >
            <Ionicons name={item} size={24} color={item === icon ? p.accent : p.textSecondary} />
          </PressableScale>
        ))}
      </View>

      <FieldLabel>Начальный остаток, ₽</FieldLabel>
      <TextInput
        value={initial}
        onChangeText={(text) => setInitial(text.replace(/[^\d,.-]/g, '').replace(/(?!^)-/g, ''))}
        placeholder="0"
        placeholderTextColor={p.textTertiary}
        keyboardType="numbers-and-punctuation"
        style={[styles.input, styles.balanceInput, { backgroundColor: p.card, color: p.text }]}
        onSubmitEditing={save}
      />
      <Text style={{ color: p.textTertiary, fontSize: 12, marginTop: 8 }}>
        Укажите фактический остаток на момент создания счёта. Для кредитной задолженности можно ввести отрицательное число.
      </Text>

      {error ? (
        <View style={[styles.error, { backgroundColor: p.danger + '1A' }]}>
          <Ionicons name="alert-circle" size={18} color={p.danger} />
          <Text style={{ color: p.danger, flex: 1, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  current: { borderRadius: radius.lg, padding: 16, gap: 4 },
  input: { height: 50, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 },
  balanceInput: { fontSize: 24, fontWeight: '700' },
  icons: { flexDirection: 'row', gap: 10 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: radius.md },
});
