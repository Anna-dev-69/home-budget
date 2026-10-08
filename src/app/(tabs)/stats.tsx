import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeIn, ProgressBar, useFocusKey, useScreenFocused } from '@/components/anim';
import { BarChart, CumulativeChart, DonutChart } from '@/components/charts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Segmented } from '@/components/Segmented';
import { Card, CategoryIcon, Empty, Screen, SectionHeader } from '@/components/ui';
import { buildInsight, cumulativeExpenses, monthlyHistory, totalLimit, totalsByCategory, transactionsInMonth } from '@/data/selectors';
import { useBudget } from '@/data/store';
import type { TxType } from '@/data/types';
import { radius, useTheme } from '@/theme';
import { currentMonthKey, daysInMonth, formatMoney, monthLabel, monthShort } from '@/utils/format';

export default function StatsScreen() {
  const p = useTheme();
  const { state } = useBudget();
  const focus = useFocusKey();
  const screenFocused = useScreenFocused();
  const [month, setMonth] = useState(currentMonthKey());
  const [type, setType] = useState<TxType>('expense');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const history = monthlyHistory(state, month, 6);
  const [barIndex, setBarIndex] = useState(history.length - 1);

  const txs = transactionsInMonth(state, month);
  const totals = totalsByCategory(state, txs, type);
  const sum = totals.reduce((s, t) => s + t.amount, 0);
  const selected = totals.find((t) => t.category.id === selectedCat);
  const insight = buildInsight(state, month);
  const chartKey = `${focus}-${month}-${type}`;
  const bar = history[Math.min(barIndex, history.length - 1)];

  const changeMonth = (key: string) => {
    setMonth(key);
    setSelectedCat(null);
    setBarIndex(5);
  };

  return (
    <Screen title="Статистика">
      <MonthSwitcher value={month} onChange={changeMonth} />
      <View style={{ marginTop: 14 }}>
        <Segmented<TxType>
          value={type}
          onChange={(t) => {
            setType(t);
            setSelectedCat(null);
          }}
          options={[
            { value: 'expense', label: 'Расходы' },
            { value: 'income', label: 'Доходы' },
          ]}
        />
      </View>

      <FadeIn trigger={chartKey}>
        <Card style={{ marginTop: 16, alignItems: 'center' }}>
          {totals.length === 0 ? (
            <Empty icon="pie-chart-outline" text={`За ${monthLabel(month).toLowerCase()} нет данных`} />
          ) : (
            <>
              <DonutChart
                animate={screenFocused}
                trigger={chartKey}
                data={totals.map((t) => ({ id: t.category.id, value: t.amount, color: t.category.color }))}
                selectedId={selectedCat}
                onSelect={setSelectedCat}
                centerTop={selected ? selected.category.name : type === 'expense' ? 'Потрачено' : 'Получено'}
                centerValue={formatMoney(selected ? selected.amount : sum)}
                size={220}
              />
              <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                {totals.map((t) => {
                  const active = selectedCat === t.category.id;
                  return (
                    <Pressable
                      key={t.category.id}
                      onPress={() => setSelectedCat(active ? null : t.category.id)}
                      style={[styles.legendRow, active && { backgroundColor: p.cardAlt }]}
                    >
                      <CategoryIcon icon={t.category.icon} color={t.category.color} size={32} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.rowBetween}>
                          <Text style={{ color: p.text, fontSize: 14, fontWeight: '600' }}>{t.category.name}</Text>
                          <Text style={{ color: p.text, fontSize: 14, fontWeight: '700' }}>{formatMoney(t.amount)}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <ProgressBar ratio={t.share} color={t.category.color} track={p.track} height={5} trigger={chartKey} />
                          </View>
                          <Text style={{ color: p.textTertiary, fontSize: 12, width: 36, textAlign: 'right' }}>{Math.round(t.share * 100)}%</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </Card>
      </FadeIn>

      {insight && (
        <FadeIn trigger={chartKey} delay={100}>
          <View style={[styles.insight, { backgroundColor: (insight.tone === 'warning' ? p.warning : insight.tone === 'success' ? p.success : p.accent) + '1F' }]}>
            <Ionicons
              name={insight.tone === 'warning' ? 'alert-circle' : insight.tone === 'success' ? 'trophy' : 'bulb'}
              size={22}
              color={insight.tone === 'warning' ? p.warning : insight.tone === 'success' ? p.success : p.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: p.text, fontWeight: '700', fontSize: 14 }}>{insight.title}</Text>
              <Text style={{ color: p.textSecondary, fontSize: 13, marginTop: 2 }}>{insight.text}</Text>
            </View>
          </View>
        </FadeIn>
      )}

      <FadeIn trigger={chartKey} delay={160}>
        <SectionHeader title="Доходы и расходы за полгода" />
        <Card>
          <BarChart
            animate={screenFocused}
            trigger={chartKey}
            data={history.map((h) => ({ label: monthShort(h.key), income: h.income, expense: h.expense }))}
            selected={barIndex}
            onSelect={setBarIndex}
          />
          <View style={[styles.barSummary, { borderTopColor: p.border }]}>
            <Text style={{ color: p.textSecondary, fontSize: 13 }}>{monthLabel(bar.key)}</Text>
            <View style={styles.barValues}>
              <Text style={{ color: p.success, fontWeight: '700' }}>{formatMoney(bar.income, { sign: true })}</Text>
              <Text style={{ color: p.danger, fontWeight: '700' }}>{formatMoney(-bar.expense)}</Text>
              <Text style={{ color: p.text, fontWeight: '700' }}>= {formatMoney(bar.income - bar.expense, { sign: true })}</Text>
            </View>
          </View>
        </Card>
      </FadeIn>

      {totalLimit(state) > 0 && (
        <FadeIn trigger={chartKey} delay={220}>
          <SectionHeader title="Расходы с начала месяца" />
          <Card>
            <CumulativeChart
              animate={screenFocused}
              trigger={chartKey}
              actual={cumulativeExpenses(state, month)}
              days={daysInMonth(month)}
              plan={totalLimit(state)}
            />
          </Card>
        </FadeIn>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.md },
  insight: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, marginTop: 14, alignItems: 'flex-start' },
  barSummary: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12, gap: 4 },
  barValues: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
});
