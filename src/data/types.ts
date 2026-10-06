import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type TxType = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  type: TxType;
  color: string;
  icon: IconName;
};

export type Account = {
  id: string;
  name: string;
  icon: IconName;
  /** Starting balance; the current balance is derived from transactions and goal deposits. */
  initial: number;
};

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  accountId: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  note: string;
  createdAt: number;
};

export type GoalDeposit = {
  id: string;
  amount: number;
  accountId: string;
  date: string;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  /** Month key, YYYY-MM. */
  deadline: string;
  deposits: GoalDeposit[];
};

export type BudgetState = {
  version: 1;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  /** Monthly limit per expense category id. */
  limits: Record<string, number>;
  goals: Goal[];
};
