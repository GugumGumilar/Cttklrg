import { useState } from 'react';
import {
  Wallet,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Check,
  X,
  CreditCard,
} from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import { useToast } from './Toast';

interface BudgetSummaryProps {
  monthlyBudget: number;
  onUpdateBudget: (newBudget: number) => Promise<void>;
  totalSpentThisMonth: number;
  totalTransactionsThisMonth: number;
  selectedMonth: string; // YYYY-MM
  onChangeMonth: (month: string) => void;
  availableMonths: string[];
}

export default function BudgetSummary({
  monthlyBudget,
  onUpdateBudget,
  totalSpentThisMonth,
  totalTransactionsThisMonth,
  selectedMonth,
  onChangeMonth,
  availableMonths,
}: BudgetSummaryProps) {
  const toast = useToast();
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [isSaving, setIsSaving] = useState(false);

  const remainingBudget = monthlyBudget - totalSpentThisMonth;
  const percentSpent = monthlyBudget > 0 ? Math.min(Math.round((totalSpentThisMonth / monthlyBudget) * 100), 999) : 0;

  // Days in month & daily average
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const dailyAverage = currentDay > 0 ? Math.round(totalSpentThisMonth / currentDay) : 0;

  // Status configuration
  let statusText = 'Anggaran Aman';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let progressColor = 'bg-emerald-500';

  if (percentSpent >= 100) {
    statusText = 'Melebihi Anggaran!';
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
    progressColor = 'bg-rose-500';
  } else if (percentSpent >= 75) {
    statusText = 'Waspada (Mendekati Batas)';
    statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
    progressColor = 'bg-amber-500';
  }

  const handleSaveBudget = async () => {
    const val = Number(budgetInput);
    if (val <= 0) {
      toast.error('Nominal anggaran bulanan harus lebih dari Rp 0');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateBudget(val);
      setIsEditingBudget(false);
      toast.success('Anggaran bulanan berhasil diperbarui');
    } catch (err: any) {
      toast.error(`Gagal memperbarui anggaran: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatMonthLabel = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
    } catch {
      return mStr;
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-6">
      {/* Top Header with Month Selector and Budget Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Anggaran Belanja Keluarga
            </h3>
            <p className="text-xs text-slate-500">
              Periode: {formatMonthLabel(selectedMonth)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${statusColor}`}
          >
            {percentSpent >= 100 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            {statusText} ({percentSpent}%)
          </span>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Anggaran */}
        <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Target Anggaran Bulanan</span>
            {!isEditingBudget && (
              <button
                type="button"
                onClick={() => {
                  setBudgetInput(monthlyBudget.toString());
                  setIsEditingBudget(true);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 text-[11px]"
              >
                <Edit2 className="h-3 w-3" />
                Ubah
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded-lg border border-blue-400 px-2.5 py-1 text-sm font-semibold text-slate-900 focus:outline-hidden bg-white"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors"
                title="Simpan"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="rounded-lg bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 transition-colors"
                title="Batal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-1.5 text-xl font-bold text-slate-900 tracking-tight">
              {formatRupiah(monthlyBudget)}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Batas pengeluaran keluarga
          </span>
        </div>

        {/* Card 2: Terpakai */}
        <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Terpakai</span>
            <span className="text-[11px] font-semibold text-blue-600">
              {totalTransactionsThisMonth} Transaksi
            </span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(totalSpentThisMonth)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            <TrendingDown className="h-3 w-3 text-slate-400" />
            <span>Rata-rata {formatRupiah(dailyAverage)} / hari</span>
          </div>
        </div>

        {/* Card 3: Sisa Anggaran */}
        <div
          className={`rounded-xl p-4 border ${
            remainingBudget < 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>{remainingBudget < 0 ? 'Defisit / Boncos' : 'Sisa Anggaran Tersedia'}</span>
            <CreditCard className="h-4 w-4 opacity-60" />
          </div>
          <div
            className={`mt-1.5 text-xl font-bold tracking-tight ${
              remainingBudget < 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {formatRupiah(Math.abs(remainingBudget))}
          </div>
          <span className="text-[11px] opacity-80 mt-0.5 block">
            {remainingBudget < 0
              ? 'Melebihi target anggaran yang ditentukan'
              : `${100 - percentSpent}% anggaran masih tersimpan aman`}
          </span>
        </div>
      </div>

      {/* Visual Budget Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>Penggunaan Anggaran Bulan Ini</span>
          <span className="font-semibold text-slate-800">
            {percentSpent}% ({formatRupiah(totalSpentThisMonth)} dari {formatRupiah(monthlyBudget)})
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
