import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedNumber, ProgressBar, useShake } from '@/components/anim';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Button, Card, Chip, closeModal, FieldLabel, ModalScreen } from '@/components/ui';
import { accountBalance, accountName, goalSaved } from '@/data/selectors';
import { useBudget } from '@/data/store';
import type { Goal } from '@/data/types';
import { radius, useTheme } from '@/theme';
import { currentMonthKey, dateLabel, deadlineLabel, formatMoney, monthsUntil, parseAmount, pluralize, shiftMonth } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function GoalModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useBudget();
  const goal = id ? state.goals.find((g) => g.id === id) : undefined;
  return goal ? <GoalDetails goal={goal} /> : <NewGoal />;
}

function NewGoal() {
  const p = useTheme();
  const { addGoal } = useBudget();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState(shiftMonth(currentMonthKey(), 6));
  const { style: shakeStyle, shake } = useShake();
  const value = parseAmount(target);
  const months = Math.max(1, monthsUntil(deadline));

  const save = async () => {
    if (!name.trim() || value <= 0) {
      haptics.warning();
      shake();
      return;
    }
    await addGoal({ name: name.trim(), target: value, deadline });
    haptics.success();
    closeModal();
  };

  return (
    <ModalScreen title="Новая цель" footer={<Button title="Создать цель" icon="flag" onPress={save} />}>
      <Animated.View style={shakeStyle}>
        <FieldLabel>Название</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Например, «Отпуск»"
          placeholderTextColor={p.textTertiary}
          autoFocus
          style={[styles.input, { backgroundColor: p.card, color: p.text }]}
          maxLength={40}
        />
        <FieldLabel>Сколько нужно накопить, ₽</FieldLabel>
        <TextInput
          value={target}
          onChangeText={(t) => setTarget(t.replace(/[^\d]/g, ''))}
          placeholder="100 000"
          placeholderTextColor={p.textTertiary}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: p.card, color: p.text, fontSize: 22, fontWeight: '700' }]}
        />
      </Animated.View>
      <FieldLabel>Срок</FieldLabel>
      <Card>
        <MonthSwitcher value={deadline} onChange={setDeadline} min={shiftMonth(currentMonthKey(), 1)} max={shiftMonth(currentMonthKey(), 120)} />
      </Card>
      {value > 0 && (
        <View style={[styles.hint, { backgroundColor: p.accentSoft }]}>
          <Ionicons name="calculator-outline" size={20} color={p.accent} />
          <Text style={{ color: p.text, flex: 1, fontSize: 14 }}>
            Откладывайте <Text style={{ fontWeight: '700' }}>{formatMoney(Math.ceil(value / months))}</Text> в месяц — {months}{' '}
            {pluralize(months, 'месяц', 'месяца', 'месяцев')} до цели.
          </Text>
        </View>
      )}
    </ModalScreen>
  );
}

function GoalDetails({ goal }: { goal: Goal }) {
  const p = useTheme();
  const { state, depositToGoal, deleteGoal } = useBudget();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { style: shakeStyle, shake } = useShake();

  const saved = goalSaved(goal);
  const left = Math.max(0, goal.target - saved);
  const months = Math.max(1, monthsUntil(goal.deadline));
  const value = parseAmount(amount);
  const available = accountBalance(state, accountId);

  const deposit = async () => {
    if (value <= 0 || value > available) {
      haptics.warning();
      shake();
      return;
    }
    await depositToGoal(goal.id, value, accountId);
    setAmount('');
    haptics.success();
  };

  const remove = async () => {
    if (!confirmDelete) {
      haptics.warning();
      setConfirmDelete(true);
      return;
    }
    await deleteGoal(goal.id);
    closeModal();
  };

  return (
    <ModalScreen
      title={goal.name}
      footer={
        <Button
          variant="danger"
          icon="trash-outline"
          title={confirmDelete ? 'Нажмите ещё раз — деньги вернутся на счета' : 'Удалить цель'}
          onPress={remove}
        />
      }
    >
      <Card>
        <Text style={{ color: p.textTertiary, fontSize: 13 }}>Накоплено · {deadlineLabel(goal.deadline)}</Text>
        <AnimatedNumber value={saved} format={(n) => formatMoney(n)} style={{ color: p.text, fontSize: 30, fontWeight: '800', marginTop: 2 }} />
        <Text style={{ color: p.textSecondary, fontSize: 13 }}>из {formatMoney(goal.target)}</Text>
        <View style={{ marginTop: 12 }}>
          <ProgressBar ratio={saved / goal.target} color={p.accent} track={p.track} height={10} />
        </View>
        <Text style={{ color: p.textSecondary, fontSize: 13, marginTop: 10 }}>
          {left === 0
            ? 'Цель достигнута!'
            : `Осталось ${formatMoney(left)} — это ${formatMoney(Math.ceil(left / months))} в месяц`}
        </Text>
      </Card>

      <FieldLabel>Пополнить</FieldLabel>
      {state.accounts.length ? (
        <>
          <Animated.View style={[styles.depositRow, shakeStyle]}>
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ''))}
              placeholder="Сумма, ₽"
              placeholderTextColor={p.textTertiary}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1, backgroundColor: p.card, color: p.text }]}
              onSubmitEditing={deposit}
            />
            <Button title="Внести" icon="add" onPress={deposit} />
          </Animated.View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {state.accounts.map((a) => (
              <Chip key={a.id} label={a.name} icon={a.icon} active={a.id === accountId} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
          <Text style={{ color: value > available ? p.danger : p.textTertiary, fontSize: 12, marginTop: 8 }}>
            Доступно на счёте: {formatMoney(available)}
          </Text>
        </>
      ) : (
        <Button title="Добавить счёт для пополнений" icon="add" onPress={() => router.push('/account')} />
      )}

      {goal.deposits.length > 0 && (
        <>
          <FieldLabel>История пополнений</FieldLabel>
          <Card style={{ paddingVertical: 4 }}>
            {[...goal.deposits].reverse().map((d) => (
              <View key={d.id} style={[styles.depositItem, { borderBottomColor: p.border }]}>
                <View>
                  <Text style={{ color: p.text, fontSize: 14, fontWeight: '600' }}>{dateLabel(d.date)}</Text>
                  <Text style={{ color: p.textTertiary, fontSize: 12 }}>{accountName(state, d.accountId)}</Text>
                </View>
                <Text style={{ color: p.accent, fontSize: 15, fontWeight: '700' }}>{formatMoney(d.amount, { sign: true })}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: radius.md, paddingHorizontal: 14, height: 50, fontSize: 16 },
  hint: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.md, marginTop: 16 },
  depositRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  depositItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
