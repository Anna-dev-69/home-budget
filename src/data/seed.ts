import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_LIMITS } from './categories';
import type { BudgetState, Goal, Transaction, TxType } from './types';
import { daysInMonth, shiftMonth, currentMonthKey, todayISO } from '@/utils/format';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TITLES: Record<string, string[]> = {
  food: ['Пятёрочка', 'Перекрёсток', 'ВкусВилл', 'Магнит', 'Рынок', 'Лента'],
  cafe: ['Кофейня', 'Обед', 'Пиццерия', 'Суши', 'Бургерная'],
  transport: ['Такси', 'Метро', 'Каршеринг'],
  fun: ['Кино', 'Концерт', 'Боулинг', 'Книги', 'Театр'],
  health: ['Аптека', 'Стоматолог', 'Анализы'],
  clothes: ['Кроссовки', 'Куртка', 'Джинсы'],
  freelance: ['Заказ на фрилансе', 'Консультация'],
};

/** Demo data for the last six months, generated relative to today so the app always looks alive. */
export function createDemoState(): BudgetState {
  const rand = mulberry32(20261006);
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 10) * 10;
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const today = todayISO();
  const current = currentMonthKey();

  const txs: Transaction[] = [];
  let counter = 0;
  const add = (type: TxType, categoryId: string, amount: number, monthKey: string, day: number, note: string, accountId?: string) => {
    const dim = daysInMonth(monthKey);
    const date = `${monthKey}-${String(Math.min(day, dim)).padStart(2, '0')}`;
    if (date > today) return;
    const account =
      accountId ?? (type === 'income' ? 'salary-card' : rand() < 0.6 ? 'main' : rand() < 0.75 ? 'salary-card' : 'cash');
    counter += 1;
    txs.push({ id: `demo-${counter}`, type, amount, categoryId, accountId: account, date, note, createdAt: counter });
  };

  for (let back = 5; back >= 0; back--) {
    const key = shiftMonth(current, -back);
    const dim = daysInMonth(key);
    const day = () => 1 + Math.floor(rand() * dim);

    add('expense', 'home', 35000, key, 1, 'Аренда квартиры', 'main');
    add('expense', 'transport', 1500, key, 2, 'Проездной', 'main');
    add('expense', 'subs', 399, key, 2, 'Яндекс Плюс', 'main');
    add('expense', 'subs', 299, key, 15, 'Облачное хранилище', 'main');
    add('income', 'salary', 95000 + between(0, 15000), key, 5, 'Зарплата');
    add('income', 'cashback', between(800, 1600), key, 5, 'Кешбэк', 'main');

    for (let i = 0; i < 9; i++) add('expense', 'food', between(900, 3500), key, day(), pick(TITLES.food));
    for (let i = 0; i < 7; i++) add('expense', 'cafe', between(300, 1400), key, day(), pick(TITLES.cafe));
    for (let i = 0; i < 4; i++) add('expense', 'transport', between(300, 900), key, day(), pick(TITLES.transport));
    for (let i = 0; i < 2; i++) add('expense', 'fun', between(600, 2500), key, day(), pick(TITLES.fun));
    if (rand() < 0.7) add('expense', 'health', between(400, 2000), key, day(), pick(TITLES.health));
    if (rand() < 0.5) add('expense', 'clothes', between(2000, 7000), key, day(), pick(TITLES.clothes));
    if (rand() < 0.5) add('income', 'freelance', between(8000, 25000), key, day(), pick(TITLES.freelance), 'main');
  }

  const deadline = (months: number) => shiftMonth(current, months);
  const deposit = (n: number, amount: number, monthsBack: number): Goal['deposits'][number] => ({
    id: `dep-${n}`,
    amount,
    accountId: 'salary-card',
    date: `${shiftMonth(current, -monthsBack)}-06`,
  });
  const goals: Goal[] = [
    { id: 'goal-trip', name: 'Отпуск летом', target: 150000, deadline: deadline(8), deposits: [deposit(1, 24000, 4), deposit(2, 20000, 2), deposit(3, 20000, 1)] },
    { id: 'goal-safety', name: 'Подушка безопасности', target: 300000, deadline: deadline(14), deposits: [deposit(4, 150000, 5), deposit(5, 30000, 3)] },
    { id: 'goal-laptop', name: 'Новый ноутбук', target: 120000, deadline: deadline(5), deposits: [deposit(6, 22000, 3), deposit(7, 20000, 1)] },
  ].map((g) => ({ ...g, deposits: g.deposits.filter((d) => d.date <= today) }));

  const targets: Record<string, number> = { main: 48200, 'salary-card': 21500, cash: 3400 };
  const accounts = DEFAULT_ACCOUNTS.map((a) => {
    const net = txs.filter((t) => t.accountId === a.id).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const deposited = goals.flatMap((g) => g.deposits).filter((d) => d.accountId === a.id).reduce((s, d) => s + d.amount, 0);
    return { ...a, initial: targets[a.id] - net + deposited };
  });

  return {
    version: 1,
    accounts,
    categories: DEFAULT_CATEGORIES,
    transactions: txs,
    limits: { ...DEFAULT_LIMITS },
    goals,
  };
}

export function createEmptyState(): BudgetState {
  return {
    version: 1,
    accounts: DEFAULT_ACCOUNTS,
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    limits: { ...DEFAULT_LIMITS },
    goals: [],
  };
}
