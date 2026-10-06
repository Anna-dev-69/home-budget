import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { createDemoState, createEmptyState } from './seed';
import type { BudgetState, Goal, Transaction } from './types';
import { todayISO, uid } from '@/utils/format';

const STORAGE_KEY = 'home-budget/state/v1';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

type Action =
  | { type: 'replace'; state: BudgetState }
  | { type: 'addTx'; tx: NewTransaction }
  | { type: 'updateTx'; tx: Transaction }
  | { type: 'deleteTx'; id: string }
  | { type: 'setLimit'; categoryId: string; amount: number | null }
  | { type: 'addGoal'; goal: Pick<Goal, 'name' | 'target' | 'deadline'> }
  | { type: 'depositGoal'; goalId: string; amount: number; accountId: string }
  | { type: 'deleteGoal'; id: string };

function reducer(state: BudgetState | null, action: Action): BudgetState | null {
  if (action.type === 'replace') return action.state;
  if (!state) return state;

  switch (action.type) {
    case 'addTx':
      return { ...state, transactions: [...state.transactions, { ...action.tx, id: uid(), createdAt: Date.now() }] };
    case 'updateTx':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.tx.id ? action.tx : t)) };
    case 'deleteTx':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };
    case 'setLimit': {
      const limits = { ...state.limits };
      if (action.amount && action.amount > 0) limits[action.categoryId] = action.amount;
      else delete limits[action.categoryId];
      return { ...state, limits };
    }
    case 'addGoal':
      return { ...state, goals: [...state.goals, { ...action.goal, id: uid(), deposits: [] }] };
    case 'depositGoal':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, deposits: [...g.deposits, { id: uid(), amount: action.amount, accountId: action.accountId, date: todayISO() }] }
            : g,
        ),
      };
    case 'deleteGoal':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
  }
}

type BudgetContextValue = {
  state: BudgetState;
  addTransaction: (tx: NewTransaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  setLimit: (categoryId: string, amount: number | null) => void;
  addGoal: (goal: Pick<Goal, 'name' | 'target' | 'deadline'>) => void;
  depositToGoal: (goalId: string, amount: number, accountId: string) => void;
  deleteGoal: (id: string) => void;
  resetToDemo: () => void;
  clearAll: () => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed = raw ? (JSON.parse(raw) as BudgetState) : null;
        if (!cancelled) dispatch({ type: 'replace', state: parsed?.version === 1 ? parsed : createDemoState() });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'replace', state: createDemoState() });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo<BudgetContextValue | null>(
    () =>
      state && {
        state,
        addTransaction: (tx) => dispatch({ type: 'addTx', tx }),
        updateTransaction: (tx) => dispatch({ type: 'updateTx', tx }),
        deleteTransaction: (id) => dispatch({ type: 'deleteTx', id }),
        setLimit: (categoryId, amount) => dispatch({ type: 'setLimit', categoryId, amount }),
        addGoal: (goal) => dispatch({ type: 'addGoal', goal }),
        depositToGoal: (goalId, amount, accountId) => dispatch({ type: 'depositGoal', goalId, amount, accountId }),
        deleteGoal: (id) => dispatch({ type: 'deleteGoal', id }),
        resetToDemo: () => dispatch({ type: 'replace', state: createDemoState() }),
        clearAll: () => dispatch({ type: 'replace', state: createEmptyState() }),
      },
    [state],
  );

  if (!value) return <>{fallback ?? null}</>;
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
