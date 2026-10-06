import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedNumber, FadeIn, PressableScale, ProgressBar, useFocusKey } from '@/components/anim';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Empty, Screen, SectionHeader } from '@/components/ui';
import {
  accountBalance,
  budgetSummary,
  sortByDateDesc,
  sumOf,
  totalBalance,
  totalSavings,
  totalsByCategory,
  transactionsInMonth,
} from '@/data/selectors';
import { useBudget } from '@/data/store';
import { progressColor, radius, useTheme } from '@/theme';
import { currentMonthKey, dateLabel, formatMoney, monthLabel, pluralize, todayISO } from '@/utils/format';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export default function HomeScreen() {
  const p = useTheme();
  const { state } = useBudget();
  const focus = useFocusKey();
  const month = currentMonthKey();
  const txs = transactionsInMonth(state, month);
  const income = sumOf(txs, 'income');
  const expense = sumOf(txs, 'expense');
  const budget = budgetSummary(state, month);
  const byCategory = totalsByCategory(state, txs, 'expense');
  const recent = sortByDateDesc(state.transactions).slice(0, 5);
  const savings = totalSavings(state);

  return (
    <Screen title="Мой бюджет" subtitle={`${greeting()} · ${dateLabel(todayISO())}`}>
      <FadeIn trigger={focus}>
        <View style={[styles.balance, { backgroundColor: p.accent }]}>
          <Text style={styles.balanceLabel}>Общий баланс</Text>
          <AnimatedNumber value={totalBalance(state)} format={(n) => formatMoney(n)} style={styles.balanceValue} />
          {savings > 0 ? <Text style={styles.balanceHint}>+ {formatMoney(savings)} отложено на цели</Text> : null}
          <View style={styles.flowRow}>
            <View style={styles.flow}>
              <View style={styles.flowIcon}>
                <Ionicons name="arrow-down" size={14} color="#fff" />
              </View>
              <View>
                <Text style={styles.flowLabel}>Доходы · {monthLabel(month, false).toLowerCase()}</Text>
                <AnimatedNumber value={income} format={(n) => formatMoney(n)} style={styles.flowValue} />
              </View>
            </View>
            <View style={styles.flow}>
              <View style={styles.flowIcon}>
                <Ionicons name="arrow-up" size={14} color="#fff" />
              </View>
              <View>
                <Text style={styles.flowLabel}>Расходы</Text>
                <AnimatedNumber value={expense} format={(n) => formatMoney(n)} style={styles.flowValue} />
              </View>
            </View>
          </View>
        </View>
      </FadeIn>

      <FadeIn trigger={focus} delay={80}>
        <SectionHeader title="Бюджет на месяц" action="Подробнее" onAction={() => router.navigate('/budget')} />
        <PressableScale scaleTo={0.98} onPress={() => router.navigate('/budget')}>
          <Card>
            {budget.limit > 0 ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={{ color: p.textSecondary, fontSize: 13 }}>
                    {formatMoney(budget.spent)} из {formatMoney(budget.limit)}
                  </Text>
                  <Text style={{ color: progressColor(p, budget.ratio), fontSize: 13, fontWeight: '700' }}>{Math.round(budget.ratio * 100)}%</Text>
                </View>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar ratio={budget.ratio} color={progressColor(p, budget.ratio)} track={p.track} height={10} trigger={focus} />
                </View>
                <View style={[styles.perDay, { backgroundColor: p.cardAlt }]}>
                  <Ionicons name="today-outline" size={18} color={p.accent} />
                  <Text style={{ color: p.textSecondary, fontSize: 13, flex: 1 }}>
                    Можно тратить{' '}
                    <Text style={{ color: p.text, fontWeight: '700' }}>{formatMoney(Math.round(budget.perDay))} в день</Text> · осталось{' '}
                    {budget.daysLeft} {pluralize(budget.daysLeft, 'день', 'дня', 'дней')}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ color: p.textSecondary }}>Задайте лимиты по категориям, чтобы видеть остаток на день.</Text>
            )}
          </Card>
        </PressableScale>
      </FadeIn>

      {byCategory.length > 0 && (
        <FadeIn trigger={focus} delay={140}>
          <SectionHeader title="Куда уходят деньги" action="Статистика" onAction={() => router.navigate('/stats')} />
          <Card>
            <View style={[styles.stack, { backgroundColor: p.track }]}>
              {byCategory.map((c) => (
                <View key={c.category.id} style={{ flex: c.share, backgroundColor: c.category.color }} />
              ))}
            </View>
            <View style={styles.legend}>
              {byCategory.slice(0, 4).map((c) => (
                <View key={c.category.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c.category.color }]} />
                  <Text style={{ color: p.textSecondary, fontSize: 12 }}>
                    {c.category.name} {Math.round(c.share * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </FadeIn>
      )}

      <FadeIn trigger={focus} delay={200}>
        <SectionHeader title="Счета" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {state.accounts.map((a) => (
            <View key={a.id} style={[styles.account, { backgroundColor: p.card }]}>
              <Ionicons name={a.icon} size={20} color={p.accent} />
              <Text style={{ color: p.textTertiary, fontSize: 12, marginTop: 10 }}>{a.name}</Text>
              <AnimatedNumber value={accountBalance(state, a.id)} format={(n) => formatMoney(n)} style={{ color: p.text, fontSize: 16, fontWeight: '700', marginTop: 2 }} />
            </View>
          ))}
        </ScrollView>
      </FadeIn>

      <FadeIn trigger={focus} delay={260}>
        <SectionHeader title="Последние операции" action="Все" onAction={() => router.navigate('/operations')} />
        <Card style={{ paddingVertical: 6 }}>
          {recent.length ? recent.map((t) => <TransactionRow key={t.id} tx={t} />) : <Empty icon="receipt-outline" text="Пока нет операций. Нажмите «+», чтобы добавить первую." />}
        </Card>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { borderRadius: radius.xl, padding: 20 },
  balanceLabel: { color: '#FFFFFFCC', fontSize: 14 },
  balanceValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  balanceHint: { color: '#FFFFFFB3', fontSize: 12, marginTop: 4 },
  flowRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  flow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF24', borderRadius: radius.md, padding: 10 },
  flowIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  flowLabel: { color: '#FFFFFFCC', fontSize: 11 },
  flowValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perDay: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: radius.md },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  account: { width: 150, borderRadius: radius.lg, padding: 14 },
});
