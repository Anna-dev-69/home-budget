import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FadeIn, useFocusKey } from '@/components/anim';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Segmented } from '@/components/Segmented';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Empty, Screen } from '@/components/ui';
import { categoryById, netOf, sortByDateDesc, sumOf, transactionsInMonth } from '@/data/selectors';
import { useBudget } from '@/data/store';
import type { Transaction, TxType } from '@/data/types';
import { radius, useTheme } from '@/theme';
import { currentMonthKey, dayHeader, formatMoney } from '@/utils/format';

type Filter = 'all' | TxType;

export default function OperationsScreen() {
  const p = useTheme();
  const { state } = useBudget();
  const focus = useFocusKey();
  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const monthTxs = transactionsInMonth(state, month);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sortByDateDesc(monthTxs).filter(
      (t) =>
        (filter === 'all' || t.type === filter) &&
        (!q || t.note.toLowerCase().includes(q) || categoryById(state, t.categoryId).name.toLowerCase().includes(q)),
    );
    const byDay = new Map<string, Transaction[]>();
    for (const t of list) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);
    return [...byDay.entries()];
  }, [monthTxs, filter, query, state]);

  return (
    <Screen title="Операции">
      <View style={[styles.search, { backgroundColor: p.card }]}>
        <Ionicons name="search" size={18} color={p.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию или категории"
          placeholderTextColor={p.textTertiary}
          style={[styles.searchInput, { color: p.text }]}
          returnKeyType="search"
        />
        {query ? <Ionicons name="close-circle" size={18} color={p.textTertiary} onPress={() => setQuery('')} /> : null}
      </View>

      <View style={{ marginTop: 12 }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'expense', label: 'Расходы' },
            { value: 'income', label: 'Доходы' },
          ]}
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <MonthSwitcher value={month} onChange={setMonth} />
      </View>

      <View style={styles.totals}>
        <View style={[styles.total, { backgroundColor: p.card }]}>
          <Text style={{ color: p.textTertiary, fontSize: 12 }}>Доходы</Text>
          <Text style={{ color: p.success, fontSize: 16, fontWeight: '700' }}>{formatMoney(sumOf(monthTxs, 'income'), { sign: true })}</Text>
        </View>
        <View style={[styles.total, { backgroundColor: p.card }]}>
          <Text style={{ color: p.textTertiary, fontSize: 12 }}>Расходы</Text>
          <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>{formatMoney(-sumOf(monthTxs, 'expense'))}</Text>
        </View>
      </View>

      {groups.length === 0 ? (
        <Empty icon="search-outline" text={query ? 'Ничего не найдено' : 'В этом месяце операций нет'} />
      ) : (
        groups.map(([day, items], i) => (
          <FadeIn key={`${month}-${day}`} trigger={`${focus}-${month}-${filter}`} delay={Math.min(i, 8) * 45}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayTitle, { color: p.textTertiary }]}>{dayHeader(day)}</Text>
              <Text style={[styles.dayTitle, { color: p.textTertiary }]}>{formatMoney(netOf(items), { sign: true })}</Text>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {items.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  totals: { flexDirection: 'row', gap: 10, marginTop: 14 },
  total: { flex: 1, borderRadius: radius.md, padding: 12, gap: 2 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  dayTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
