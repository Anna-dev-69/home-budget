import type { BudgetState, Category, Goal, Transaction, TxType } from './types';
import { currentMonthKey, daysInMonth, monthKeyOf, shiftMonth, todayISO } from '@/utils/format';

export function categoryById(state: BudgetState, id: string): Category {
  return (
    state.categories.find((c) => c.id === id) ?? { id, name: 'Без категории', type: 'expense', color: '#9AA0A8', icon: 'help-outline' }
  );
}

export function accountName(state: BudgetState, id: string): string {
  return state.accounts.find((a) => a.id === id)?.name ?? 'Счёт удалён';
}

export function transactionsInMonth(state: BudgetState, key: string): Transaction[] {
  return state.transactions.filter((t) => monthKeyOf(t.date) === key);
}

export function sortByDateDesc(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export function sumOf(txs: Transaction[], type: TxType): number {
  return txs.reduce((s, t) => (t.type === type ? s + t.amount : s), 0);
}

export function netOf(txs: Transaction[]): number {
  return txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
}

export function goalSaved(goal: Goal): number {
  return goal.deposits.reduce((s, d) => s + d.amount, 0);
}

export function accountBalance(state: BudgetState, accountId: string): number {
  const account = state.accounts.find((a) => a.id === accountId);
  const net = netOf(state.transactions.filter((t) => t.accountId === accountId));
  const deposited = state.goals
    .flatMap((g) => g.deposits)
    .filter((d) => d.accountId === accountId)
    .reduce((s, d) => s + d.amount, 0);
  return (account?.initial ?? 0) + net - deposited;
}

export function totalBalance(state: BudgetState): number {
  return state.accounts.reduce((s, a) => s + accountBalance(state, a.id), 0);
}

export function totalSavings(state: BudgetState): number {
  return state.goals.reduce((s, g) => s + goalSaved(g), 0);
}

export type CategoryTotal = { category: Category; amount: number; share: number };

export function totalsByCategory(state: BudgetState, txs: Transaction[], type: TxType): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === type) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([id, amount]) => ({ category: categoryById(state, id), amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthlyHistory(state: BudgetState, endKey: string, count = 6) {
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(endKey, i - count + 1));
  return keys.map((key) => {
    const txs = transactionsInMonth(state, key);
    return { key, income: sumOf(txs, 'income'), expense: sumOf(txs, 'expense') };
  });
}

/** Elapsed days of the month: today for the current month, the whole month for past ones. */
export function elapsedDays(key: string): number {
  const current = currentMonthKey();
  if (key === current) return Number(todayISO().slice(8, 10));
  return key < current ? daysInMonth(key) : 0;
}

export function cumulativeExpenses(state: BudgetState, key: string): number[] {
  const txs = transactionsInMonth(state, key).filter((t) => t.type === 'expense');
  const perDay = new Array(elapsedDays(key)).fill(0) as number[];
  for (const t of txs) {
    const day = Number(t.date.slice(8, 10));
    if (day <= perDay.length) perDay[day - 1] += t.amount;
  }
  let acc = 0;
  return perDay.map((v) => (acc += v));
}

export function totalLimit(state: BudgetState): number {
  return Object.values(state.limits).reduce((a, b) => a + b, 0);
}

export function budgetSummary(state: BudgetState, key: string) {
  const txs = transactionsInMonth(state, key);
  const spent = sumOf(txs, 'expense');
  const limit = totalLimit(state);
  const dim = daysInMonth(key);
  const isCurrent = key === currentMonthKey();
  const daysLeft = isCurrent ? dim - elapsedDays(key) + 1 : 0;
  const perDay = isCurrent && daysLeft > 0 ? Math.max(0, (limit - spent) / daysLeft) : 0;
  return { spent, limit, daysLeft, perDay, ratio: limit ? spent / limit : 0 };
}

export type Insight = { title: string; text: string; tone: 'warning' | 'success' | 'info' };

export function buildInsight(state: BudgetState, key: string): Insight | null {
  const txs = transactionsInMonth(state, key);
  const byCat = totalsByCategory(state, txs, 'expense');
  const ratio = elapsedDays(key) / daysInMonth(key);

  const usage = byCat
    .filter((c) => state.limits[c.category.id])
    .map((c) => ({
      ...c,
      usage: c.amount / state.limits[c.category.id],
      count: txs.filter((t) => t.type === 'expense' && t.categoryId === c.category.id).length,
    }))
    .sort((a, b) => b.usage - a.usage);

  const over = usage.find((c) => c.usage > 1);
  if (over) {
    return {
      tone: 'warning',
      title: `Перерасход: ${over.category.name}`,
      text: `Лимит превышен на ${Math.round((over.usage - 1) * 100)}%. Стоит пересмотреть лимит или притормозить траты в этой категории.`,
    };
  }
  // A single payment (rent, a yearly subscription) says nothing about pace.
  const fast = usage.find((c) => c.count > 1 && ratio > 0 && c.usage > ratio + 0.25);
  if (fast) {
    return {
      tone: 'warning',
      title: `${fast.category.name}: тратите быстрее плана`,
      text: `Прошло ${Math.round(ratio * 100)}% месяца, а лимит израсходован на ${Math.round(fast.usage * 100)}%.`,
    };
  }

  const prev = sumOf(transactionsInMonth(state, shiftMonth(key, -1)), 'expense');
  const spent = sumOf(txs, 'expense');
  if (prev > 0 && ratio === 1 && spent < prev) {
    return { tone: 'success', title: 'Отличный месяц', text: `Расходы на ${Math.round((1 - spent / prev) * 100)}% меньше, чем в прошлом месяце.` };
  }
  if (byCat[0]) {
    return {
      tone: 'info',
      title: 'Главная статья расходов',
      text: `${byCat[0].category.name} — ${Math.round(byCat[0].share * 100)}% всех трат за месяц.`,
    };
  }
  return null;
}
