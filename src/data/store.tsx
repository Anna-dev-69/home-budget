import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { readBudgetState } from './database';
import type { Account, BudgetState, Goal, Transaction } from './types';
import { todayISO, uid } from '@/utils/format';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type NewAccount = Pick<Account, 'name' | 'icon' | 'initial'>;

type BudgetContextValue = {
  state: BudgetState;
  addTransaction: (tx: NewTransaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: NewAccount) => Promise<string>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setLimit: (categoryId: string, amount: number | null) => Promise<void>;
  addGoal: (goal: Pick<Goal, 'name' | 'target' | 'deadline'>) => Promise<void>;
  depositToGoal: (goalId: string, amount: number, accountId: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const db = useSQLiteContext();
  const [state, setState] = useState<BudgetState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setState(await readBudgetState(db));
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    readBudgetState(db)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error(String(reason)));
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const write = useCallback(
    async (operation: () => Promise<void>) => {
      await operation();
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<BudgetContextValue | null>(
    () =>
      state && {
        state,
        addTransaction: async (tx) => {
          await write(async () => {
            await db.runAsync(
              `INSERT INTO transactions
                (id, type, amount, category_id, account_id, date, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              uid(),
              tx.type,
              tx.amount,
              tx.categoryId,
              tx.accountId,
              tx.date,
              tx.note,
              Date.now(),
            );
          });
        },
        updateTransaction: async (tx) => {
          await write(async () => {
            await db.runAsync(
              `UPDATE transactions
                 SET type = ?, amount = ?, category_id = ?, account_id = ?, date = ?, note = ?
               WHERE id = ?`,
              tx.type,
              tx.amount,
              tx.categoryId,
              tx.accountId,
              tx.date,
              tx.note,
              tx.id,
            );
          });
        },
        deleteTransaction: async (id) => {
          await write(async () => {
            await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
          });
        },
        addAccount: async (account) => {
          const id = uid();
          await write(async () => {
            await db.runAsync(
              'INSERT INTO accounts (id, name, icon, initial_balance, created_at) VALUES (?, ?, ?, ?, ?)',
              id,
              account.name,
              account.icon,
              account.initial,
              Date.now(),
            );
          });
          return id;
        },
        updateAccount: async (account) => {
          await write(async () => {
            await db.runAsync(
              'UPDATE accounts SET name = ?, icon = ?, initial_balance = ? WHERE id = ?',
              account.name,
              account.icon,
              account.initial,
              account.id,
            );
          });
        },
        deleteAccount: async (id) => {
          const usage = await db.getFirstAsync<{ count: number }>(
            `SELECT
              (SELECT COUNT(*) FROM transactions WHERE account_id = $id) +
              (SELECT COUNT(*) FROM goal_deposits WHERE account_id = $id) AS count`,
            { $id: id },
          );
          if ((usage?.count ?? 0) > 0) {
            throw new Error('Нельзя удалить счёт с операциями или пополнениями целей.');
          }
          await write(async () => {
            await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
          });
        },
        setLimit: async (categoryId, amount) => {
          await write(async () => {
            if (amount && amount > 0) {
              await db.runAsync(
                `INSERT INTO limits (category_id, amount) VALUES (?, ?)
                 ON CONFLICT(category_id) DO UPDATE SET amount = excluded.amount`,
                categoryId,
                amount,
              );
            } else {
              await db.runAsync('DELETE FROM limits WHERE category_id = ?', categoryId);
            }
          });
        },
        addGoal: async (goal) => {
          await write(async () => {
            await db.runAsync(
              'INSERT INTO goals (id, name, target, deadline, created_at) VALUES (?, ?, ?, ?, ?)',
              uid(),
              goal.name,
              goal.target,
              goal.deadline,
              Date.now(),
            );
          });
        },
        depositToGoal: async (goalId, amount, accountId) => {
          await write(async () => {
            await db.runAsync(
              `INSERT INTO goal_deposits (id, goal_id, amount, account_id, date, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              uid(),
              goalId,
              amount,
              accountId,
              todayISO(),
              Date.now(),
            );
          });
        },
        deleteGoal: async (id) => {
          await write(async () => {
            await db.runAsync('DELETE FROM goals WHERE id = ?', id);
          });
        },
        clearAll: async () => {
          await write(async () => {
            await db.withTransactionAsync(async () => {
              await db.runAsync('DELETE FROM goal_deposits');
              await db.runAsync('DELETE FROM goals');
              await db.runAsync('DELETE FROM transactions');
              await db.runAsync('DELETE FROM limits');
              await db.runAsync('DELETE FROM accounts');
            });
          });
        },
      },
    [db, state, write],
  );

  if (error) throw error;
  if (!value) return <>{fallback ?? null}</>;
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
