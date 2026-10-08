import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedNumber, FadeIn, PressableScale, ProgressBar, useFocusKey } from '@/components/anim';
import { Button, Card, CategoryIcon, Empty, Screen, SectionHeader } from '@/components/ui';
import { budgetSummary, goalSaved, transactionsInMonth } from '@/data/selectors';
import { useBudget } from '@/data/store';
import { progressColor, radius, useTheme } from '@/theme';
import { currentMonthKey, deadlineLabel, formatMoney, monthLabel } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function BudgetScreen() {
  const p = useTheme();
  const { state, clearAll } = useBudget();
  const focus = useFocusKey();
  const [confirmClear, setConfirmClear] = useState(false);
  const month = currentMonthKey();
  const summary = budgetSummary(state, month);

  const spent: Record<string, number> = {};
  for (const t of transactionsInMonth(state, month)) if (t.type === 'expense') spent[t.categoryId] = (spent[t.categoryId] ?? 0) + t.amount;

  const expenseCats = state.categories.filter((c) => c.type === 'expense');
  const limited = expenseCats
    .filter((c) => state.limits[c.id])
    .sort((a, b) => (spent[b.id] ?? 0) / state.limits[b.id] - (spent[a.id] ?? 0) / state.limits[a.id]);
  const unlimited = expenseCats.filter((c) => !state.limits[c.id]);

  const removeAllData = async () => {
    if (!confirmClear) {
      haptics.warning();
      setConfirmClear(true);
      return;
    }
    await clearAll();
    haptics.success();
    setConfirmClear(false);
  };

  return (
    <Screen title="Бюджет и цели" subtitle={monthLabel(month)}>
      <FadeIn trigger={focus}>
        <Card>
          <Text style={{ color: p.textTertiary, fontSize: 13 }}>Осталось на месяц</Text>
          <AnimatedNumber
            value={summary.limit - summary.spent}
            format={(n) => formatMoney(n)}
            style={{ color: summary.limit - summary.spent < 0 ? p.danger : p.text, fontSize: 30, fontWeight: '800', marginTop: 2 }}
          />
          <View style={{ marginTop: 12 }}>
            <ProgressBar ratio={summary.ratio} color={progressColor(p, summary.ratio)} track={p.track} height={10} trigger={focus} />
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={{ color: p.textSecondary, fontSize: 12 }}>Потрачено {formatMoney(summary.spent)}</Text>
            <Text style={{ color: p.textSecondary, fontSize: 12 }}>Лимит {formatMoney(summary.limit)}</Text>
          </View>
        </Card>
      </FadeIn>

      <SectionHeader title="Лимиты по категориям" />
      {limited.map((c, i) => {
        const s = spent[c.id] ?? 0;
        const limit = state.limits[c.id];
        const left = limit - s;
        const ratio = s / limit;
        return (
          <FadeIn key={c.id} trigger={focus} delay={60 + i * 40}>
            <PressableScale
              scaleTo={0.98}
              onPress={() => router.push({ pathname: '/limit', params: { categoryId: c.id } })}
              style={[styles.limitRow, { backgroundColor: p.card }]}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={36} />
              <View style={{ flex: 1, gap: 7 }}>
                <View style={styles.rowBetween}>
                  <Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ color: left < 0 ? p.danger : p.textSecondary, fontSize: 13, fontWeight: left < 0 ? '700' : '400' }}>
                    {left < 0 ? `перерасход ${formatMoney(-left)}` : `осталось ${formatMoney(left)}`}
                  </Text>
                </View>
                <ProgressBar ratio={ratio} color={progressColor(p, ratio)} track={p.track} height={6} trigger={focus} />
                <Text style={{ color: p.textTertiary, fontSize: 11 }}>
                  {formatMoney(s)} из {formatMoney(limit)}
                </Text>
              </View>
            </PressableScale>
          </FadeIn>
        );
      })}
      {unlimited.length > 0 && (
        <View style={styles.unlimited}>
          {unlimited.map((c) => (
            <PressableScale
              key={c.id}
              onPress={() => router.push({ pathname: '/limit', params: { categoryId: c.id } })}
              style={[styles.addLimit, { borderColor: p.border }]}
            >
              <Ionicons name="add" size={14} color={p.accent} />
              <Text style={{ color: p.textSecondary, fontSize: 13 }}>{c.name}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      <SectionHeader title="Цели накоплений" action="Новая цель" onAction={() => router.push('/goal')} />
      {state.goals.length === 0 ? (
        <Card>
          <Empty icon="flag-outline" text="Поставьте цель — например, отпуск или подушку безопасности." />
        </Card>
      ) : (
        state.goals.map((g, i) => {
          const saved = goalSaved(g);
          const ratio = saved / g.target;
          return (
            <FadeIn key={g.id} trigger={focus} delay={100 + i * 50}>
              <PressableScale
                scaleTo={0.98}
                onPress={() => router.push({ pathname: '/goal', params: { id: g.id } })}
                style={[styles.goal, { backgroundColor: p.card }]}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.goalIcon, { backgroundColor: p.accentSoft }]}>
                      <Ionicons name={ratio >= 1 ? 'checkmark' : 'flag'} size={16} color={p.accent} />
                    </View>
                    <Text style={{ color: p.text, fontSize: 15, fontWeight: '700' }}>{g.name}</Text>
                  </View>
                  <Text style={{ color: p.textTertiary, fontSize: 12 }}>{deadlineLabel(g.deadline)}</Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <ProgressBar ratio={ratio} color={p.accent} track={p.track} height={8} trigger={focus} />
                </View>
                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Text style={{ color: p.textSecondary, fontSize: 13 }}>
                    {formatMoney(saved)} из {formatMoney(g.target)}
                  </Text>
                  <Text style={{ color: p.accent, fontSize: 13, fontWeight: '700' }}>{Math.min(100, Math.round(ratio * 100))}%</Text>
                </View>
              </PressableScale>
            </FadeIn>
          );
        })
      )}

      <SectionHeader title="Данные" />
      <View style={{ gap: 10 }}>
        <Button
          variant="danger"
          icon="trash-outline"
          title={confirmClear ? 'Нажмите ещё раз, чтобы удалить всё' : 'Удалить все локальные данные'}
          onPress={removeAllData}
        />
        <Text style={{ color: p.textTertiary, fontSize: 12, textAlign: 'center' }}>
          Счета, операции, лимиты и цели хранятся в локальной SQLite-базе и доступны без интернета.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, marginBottom: 10 },
  unlimited: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  addLimit: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  goal: { padding: 16, borderRadius: radius.lg, marginBottom: 10 },
  goalIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
