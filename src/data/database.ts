import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from './categories';
import type { Account, BudgetState, Goal, GoalDeposit, IconName, Transaction, TxType } from './types';

type AccountRow = { id: string; name: string; icon: string; initial_balance: number };
type TransactionRow = {
  id: string;
  type: TxType;
  amount: number;
  category_id: string;
  account_id: string;
  date: string;
  note: string;
  created_at: number;
};
type LimitRow = { category_id: string; amount: number };
type GoalRow = { id: string; name: string; target: number; deadline: string };
type DepositRow = { id: string; goal_id: string; amount: number; account_id: string; date: string };

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'card-outline',
      initial_balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount REAL NOT NULL CHECK (amount > 0),
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date DESC);
    CREATE INDEX IF NOT EXISTS transactions_account_idx ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category_id);

    CREATE TABLE IF NOT EXISTS limits (
      category_id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL CHECK (target > 0),
      deadline TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goal_deposits (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      amount REAL NOT NULL CHECK (amount > 0),
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS goal_deposits_goal_idx ON goal_deposits(goal_id);
    PRAGMA user_version = 1;
  `);
}

export async function readBudgetState(db: SQLiteDatabase): Promise<BudgetState> {
  const [accountRows, transactionRows, limitRows, goalRows, depositRows] = await Promise.all([
    db.getAllAsync<AccountRow>('SELECT id, name, icon, initial_balance FROM accounts ORDER BY created_at ASC'),
    db.getAllAsync<TransactionRow>(
      'SELECT id, type, amount, category_id, account_id, date, note, created_at FROM transactions ORDER BY date ASC, created_at ASC',
    ),
    db.getAllAsync<LimitRow>('SELECT category_id, amount FROM limits'),
    db.getAllAsync<GoalRow>('SELECT id, name, target, deadline FROM goals ORDER BY created_at ASC'),
    db.getAllAsync<DepositRow>(
      'SELECT id, goal_id, amount, account_id, date FROM goal_deposits ORDER BY created_at ASC',
    ),
  ]);

  const accounts: Account[] = accountRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon as IconName,
    initial: row.initial_balance,
  }));
  const transactions: Transaction[] = transactionRows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  }));
  const limits = Object.fromEntries(limitRows.map((row) => [row.category_id, row.amount]));
  const depositsByGoal = new Map<string, GoalDeposit[]>();
  for (const row of depositRows) {
    const deposit: GoalDeposit = {
      id: row.id,
      amount: row.amount,
      accountId: row.account_id,
      date: row.date,
    };
    depositsByGoal.set(row.goal_id, [...(depositsByGoal.get(row.goal_id) ?? []), deposit]);
  }
  const goals: Goal[] = goalRows.map((row) => ({
    id: row.id,
    name: row.name,
    target: row.target,
    deadline: row.deadline,
    deposits: depositsByGoal.get(row.id) ?? [],
  }));

  return {
    version: 1,
    accounts,
    categories: DEFAULT_CATEGORIES,
    transactions,
    limits,
    goals,
  };
}
