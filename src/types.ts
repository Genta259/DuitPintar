export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum AssetType {
  CASH = 'cash',
  BANK = 'bank',
  INVESTMENT = 'investment',
  OTHER = 'other'
}

export enum GoalCategory {
  MARRIAGE = 'marriage',
  HOUSE = 'house',
  EDUCATION = 'education',
  OTHER = 'other'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  balance: number;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  notes: string;
  assetId: string;
  toAssetId?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: GoalCategory;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly';
  updatedAt: string;
}
