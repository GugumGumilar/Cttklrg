export interface ExpenseItem {
  name: string;
  qty?: number;
  price?: number;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: ExpenseCategory;
  amount: number;
  memberId: string;
  memberName: string;
  notes?: string;
  items?: ExpenseItem[];
  receiptImage?: string; // base64 or thumbnail
  createdAt: string;
  syncedToSheet?: boolean;
}

export type ExpenseCategory =
  | 'Makanan & Minuman'
  | 'Belanja Bulanan & Sembako'
  | 'Kebutuhan Rumah'
  | 'Transportasi & Bensin'
  | 'Listrik, Air & Tagihan'
  | 'Kesehatan & Obat'
  | 'Pendidikan & Sekolah'
  | 'Hiburan & Liburan'
  | 'Pakaian & Belanja Lain'
  | 'Lainnya';

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface BudgetConfig {
  monthlyBudget: number;
  month: string; // YYYY-MM
}

export interface SyncEvent {
  type: 'ADD' | 'UPDATE' | 'DELETE' | 'BUDGET_UPDATE' | 'INIT';
  memberName: string;
  timestamp: string;
  expense?: Expense;
  expenseId?: string;
  budget?: number;
}

export interface ParsedReceiptData {
  merchant: string;
  date: string;
  total: number;
  category: ExpenseCategory;
  items: { name: string; qty?: number; price?: number }[];
  confidence?: string;
}
