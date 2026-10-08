import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedNumber, FadeIn, PressableScale, ProgressBar, useFocusKey } from '@/components/anim';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, Card, Empty, SectionHeader } from '@/components/ui';
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
import { currentMonthKey, formatMoney, monthAccusative, pluralize } from '@/utils/format';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export default function HomeScreen() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.screen, { backgroundColor: p.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.greeting, { color: p.textSecondary }]}>{greeting()}</Text>

        <FadeIn trigger={focus}>
          <View style={[styles.balance, { backgroundColor: p.card }]}>
            <Text style={[styles.balanceLabel, { color: p.textSecondary }]}>Общий баланс</Text>
            <AnimatedNumber value={totalBalance(state)} format={(n) => formatMoney(n)} style={[styles.balanceValue, { color: p.text }]} />
            {savings > 0 ? (
              <Text style={[styles.balanceHint, { color: p.textTertiary }]}>+ {formatMoney(savings)} на накопительном счёте</Text>
            ) : null}
            <View style={styles.flowRow}>
              <View style={[styles.flow, { backgroundColor: p.bg }]}>
                <Text style={[styles.flowLabel, { color: p.textTertiary }]}>Доходы за {monthAccusative(month)}</Text>
                <AnimatedNumber
                  value={income}
                  format={(n) => formatMoney(n, { sign: true })}
                  style={[styles.flowValue, { color: p.success }]}
                />
              </View>
              <View style={[styles.flow, { backgroundColor: p.bg }]}>
                <Text style={[styles.flowLabel, { color: p.textTertiary }]}>Расходы за {monthAccusative(month)}</Text>
                <AnimatedNumber
                  value={expense}
                  format={(n) => formatMoney(-n)}
                  style={[styles.flowValue, { color: p.danger }]}
                />
              </View>
            </View>
          </View>
        </FadeIn>

        <FadeIn trigger={focus} delay={80}>
          <SectionHeader
            title={`Бюджет на ${monthAccusative(month)}`}
            action="Все бюджеты"
            onAction={() => router.navigate('/budget')}
          />
          <PressableScale scaleTo={0.99} onPress={() => router.navigate('/budget')} style={styles.budget}>
            {budget.limit > 0 ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={[styles.budgetMeta, { color: p.textSecondary }]}>
                    Потрачено {formatMoney(budget.spent)} из {formatMoney(budget.limit)}
                  </Text>
                  <Text style={[styles.budgetPercent, { color: p.textSecondary }]}>{Math.round(budget.ratio * 100)}%</Text>
                </View>
                <View style={styles.progress}>
                  <ProgressBar ratio={budget.ratio} color={progressColor(p, budget.ratio)} track={p.track} height={8} trigger={focus} />
                </View>
                <Text style={[styles.perDay, { color: p.textSecondary }]}>
                  Можно тратить <Text style={{ color: p.text, fontWeight: '700' }}>{formatMoney(Math.round(budget.perDay))} в день</Text> · осталось{' '}
                  {budget.daysLeft} {pluralize(budget.daysLeft, 'день', 'дня', 'дней')}.
                </Text>
              </>
            ) : (
              <Text style={{ color: p.textSecondary }}>Задайте лимиты по категориям, чтобы видеть остаток на день.</Text>
            )}
          </PressableScale>
        </FadeIn>

        <FadeIn trigger={focus} delay={140}>
          <SectionHeader title="Счета" action="Добавить" onAction={() => router.push('/account')} />
          {state.accounts.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accounts}>
              {state.accounts.map((a) => (
                <PressableScale
                  key={a.id}
                  onPress={() => router.push({ pathname: '/account', params: { id: a.id } })}
                  style={[styles.account, { borderColor: p.border }]}
                >
                  <Text numberOfLines={1} style={[styles.accountName, { color: p.textTertiary }]}>{a.name}</Text>
                  <AnimatedNumber
                    value={accountBalance(state, a.id)}
                    format={(n) => formatMoney(n)}
                    style={[styles.accountValue, { color: p.text }]}
                  />
                </PressableScale>
              ))}
            </ScrollView>
          ) : (
            <Card>
              <Empty icon="wallet-outline" text="Добавьте карту, наличные или другой счёт — после этого можно вносить операции." />
              <Button title="Добавить первый счёт" icon="add" onPress={() => router.push('/account')} />
            </Card>
          )}
        </FadeIn>

        <FadeIn trigger={focus} delay={200}>
          <SectionHeader title="Последние операции" action="Все" onAction={() => router.navigate('/operations')} />
          <View>
            {recent.length ? recent.map((t) => <TransactionRow key={t.id} tx={t} />) : <Empty icon="receipt-outline" text="Пока нет операций. Нажмите «+», чтобы добавить первую." />}
          </View>
        </FadeIn>

        {byCategory.length > 0 && (
          <FadeIn trigger={focus} delay={260}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  greeting: { fontSize: 14, marginBottom: 14 },
  balance: { borderRadius: radius.lg, padding: 18 },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  balanceHint: { fontSize: 11, marginTop: 1 },
  flowRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  flow: { flex: 1, minWidth: 0, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13 },
  flowLabel: { fontSize: 11, marginBottom: 3 },
  flowValue: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budget: { paddingBottom: 2 },
  budgetMeta: { fontSize: 13 },
  budgetPercent: { fontSize: 12, fontWeight: '600' },
  progress: { marginTop: 9 },
  perDay: { fontSize: 13, marginTop: 12 },
  accounts: { gap: 10, paddingRight: 18 },
  account: { width: 132, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  accountName: { fontSize: 11, marginBottom: 3 },
  accountValue: { fontSize: 15, fontWeight: '700' },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
