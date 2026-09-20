import { ExpenseCategory } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) {
      return dateStr;
    }
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; border: string; bar: string }> = {
  'Belanja Bulanan & Sembako': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: '#10B981',
  },
  'Makanan & Minuman': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: '#F59E0B',
  },
  'Kebutuhan Rumah': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: '#3B82F6',
  },
  'Transportasi & Bensin': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    bar: '#06B6D4',
  },
  'Listrik, Air & Tagihan': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    bar: '#6366F1',
  },
  'Kesehatan & Obat': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: '#F43F5E',
  },
  'Pendidikan & Sekolah': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    bar: '#8B5CF6',
  },
  'Hiburan & Liburan': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    bar: '#EC4899',
  },
  'Pakaian & Belanja Lain': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    bar: '#F97316',
  },
  'Lainnya': {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    bar: '#64748B',
  },
};

export const ALL_CATEGORIES: ExpenseCategory[] = [
  'Belanja Bulanan & Sembako',
  'Makanan & Minuman',
  'Kebutuhan Rumah',
  'Transportasi & Bensin',
  'Listrik, Air & Tagihan',
  'Kesehatan & Obat',
  'Pendidikan & Sekolah',
  'Hiburan & Liburan',
  'Pakaian & Belanja Lain',
  'Lainnya',
];
