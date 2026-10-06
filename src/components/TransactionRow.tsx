import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './anim';
import { CategoryIcon } from './ui';
import { accountName, categoryById } from '@/data/selectors';
import { useBudget } from '@/data/store';
import type { Transaction } from '@/data/types';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils/format';

export function TransactionRow({ tx }: { tx: Transaction }) {
  const p = useTheme();
  const { state } = useBudget();
  const category = categoryById(state, tx.categoryId);
  const income = tx.type === 'income';
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
      style={styles.row}
    >
      <CategoryIcon icon={category.icon} color={category.color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.title, { color: p.text }]}>
          {tx.note || category.name}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: p.textTertiary }]}>
          {category.name} · {accountName(state, tx.accountId)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: income ? p.success : p.text }]}>{formatMoney(income ? tx.amount : -tx.amount, { sign: true })}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
});
