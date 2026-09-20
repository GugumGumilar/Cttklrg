import { useState } from 'react';
import { PieChart, Users, TrendingUp, ShoppingBag } from 'lucide-react';
import { Expense, ExpenseCategory, FamilyMember } from '../types';
import { CATEGORY_COLORS, formatRupiah } from '../utils/formatters';

interface ExpenseChartsProps {
  expenses: Expense[];
  members: FamilyMember[];
  selectedMonth: string; // YYYY-MM
}

export default function ExpenseCharts({
  expenses,
  members,
  selectedMonth,
}: ExpenseChartsProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'members' | 'trend'>('category');

  // Filter expenses for selected month
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));
  const totalMonthlySpent = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // 1. Group by Category
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  monthlyExpenses.forEach((exp) => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = { total: 0, count: 0 };
    }
    categoryTotals[exp.category].total += exp.amount;
    categoryTotals[exp.category].count += 1;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([cat, data]) => ({
      category: cat as ExpenseCategory,
      total: data.total,
      count: data.count,
      percent: totalMonthlySpent > 0 ? Math.round((data.total / totalMonthlySpent) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 2. Group by Family Member
  const memberTotals: Record<string, { name: string; total: number; count: number; color: string }> = {};

  // Initialize with known members
  members.forEach((m) => {
    memberTotals[m.id] = { name: m.name, total: 0, count: 0, color: m.color };
  });

  monthlyExpenses.forEach((exp) => {
    const memberId = exp.memberId || 'other';
    if (!memberTotals[memberId]) {
      memberTotals[memberId] = {
        name: exp.memberName || 'Lainnya',
        total: 0,
        count: 0,
        color: '#64748B',
      };
    }
    memberTotals[memberId].total += exp.amount;
    memberTotals[memberId].count += 1;
  });

  const sortedMembers = Object.values(memberTotals)
    .filter((m) => m.total > 0 || members.some((mem) => mem.name === m.name))
    .map((m) => ({
      ...m,
      percent: totalMonthlySpent > 0 ? Math.round((m.total / totalMonthlySpent) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 3. Daily spending trend (Days 1 to Days in Month)
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyTotals: { day: number; dateStr: string; total: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const fullDate = `${selectedMonth}-${dayStr}`;
    const daySum = monthlyExpenses
      .filter((e) => e.date === fullDate)
      .reduce((acc, curr) => acc + curr.amount, 0);
    dailyTotals.push({ day: d, dateStr: fullDate, total: daySum });
  }

  const maxDailySpend = Math.max(...dailyTotals.map((d) => d.total), 100000);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-6">
      {/* Visual Header with Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Grafik & Analisis Belanja
            </h3>
            <p className="text-xs text-slate-500">
              Visualisasi pengeluaran keluarga bulan ini
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === 'category'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Anggota Keluarga
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trend')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === 'trend'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Tren Harian
          </button>
        </div>
      </div>

      {monthlyExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ShoppingBag className="mx-auto h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm font-medium">Belum ada data belanja untuk bulan ini</p>
          <p className="text-xs text-slate-400 mt-1">
            Gunakan tombol scan bon atau catat manual untuk mulai memantau
          </p>
        </div>
      ) : (
        <div>
          {/* TAB 1: KATEGORI PENGELUARAN */}
          {activeTab === 'category' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Visual Stacked Progress Bar Representation */}
                <div className="space-y-3">
                  <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 p-0.5 border border-slate-200">
                    {sortedCategories.map((item, idx) => {
                      const color = CATEGORY_COLORS[item.category]?.bar || '#64748B';
                      return (
                        <div
                          key={idx}
                          title={`${item.category}: ${item.percent}% (${formatRupiah(item.total)})`}
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: color,
                          }}
                          className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                        />
                      );
                    })}
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    Total Pengeluaran: <strong className="text-slate-800">{formatRupiah(totalMonthlySpent)}</strong> ({sortedCategories.length} kategori)
                  </p>
                </div>

                {/* Legend & Breakdown List */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                  {sortedCategories.map((item, idx) => {
                    const color = CATEGORY_COLORS[item.category]?.bar || '#64748B';
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="truncate">
                            <span className="text-xs font-medium text-slate-800 block truncate">
                              {item.category}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.count} transaksi
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 block">
                            {formatRupiah(item.total)}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KONTRIBUSI ANGGOTA KELUARGA */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Membandingkan pengeluaran belanja yang dibayarkan oleh masing-masing anggota keluarga:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold shadow-xs"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{m.name}</h4>
                          <span className="text-[11px] text-slate-500">{m.count} transaksi</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {m.percent}%
                      </span>
                    </div>

                    <div>
                      <span className="text-lg font-bold text-slate-900 block">
                        {formatRupiah(m.total)}
                      </span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${m.percent}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TREN PENGELUARAN HARIAN */}
          {activeTab === 'trend' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Grafik Pengeluaran Harian (Tgl 1 - {daysInMonth})</span>
                <span className="font-medium text-slate-700">
                  Tertinggi: {formatRupiah(maxDailySpend)}
                </span>
              </div>

              {/* Bar Chart Container */}
              <div className="relative h-44 w-full rounded-xl bg-slate-50 p-3 pt-6 border border-slate-200 flex items-end gap-1 sm:gap-1.5 overflow-x-auto">
                {dailyTotals.map((item) => {
                  const heightPercent = maxDailySpend > 0 ? (item.total / maxDailySpend) * 100 : 0;
                  const hasExpense = item.total > 0;

                  return (
                    <div
                      key={item.day}
                      className="group relative flex-1 min-w-[12px] h-full flex flex-col justify-end items-center cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute bottom-full mb-2 hidden -translate-x-1/2 left-1/2 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white shadow-md group-hover:block">
                        <p className="font-semibold">Tgl {item.day}</p>
                        <p className="text-emerald-400">{formatRupiah(item.total)}</p>
                      </div>

                      {/* Bar element */}
                      <div
                        style={{ height: `${Math.max(heightPercent, hasExpense ? 6 : 2)}%` }}
                        className={`w-full rounded-t-sm transition-all duration-200 ${
                          hasExpense
                            ? 'bg-indigo-500 hover:bg-indigo-600'
                            : 'bg-slate-200/60'
                        }`}
                      />

                      {/* Day Number (shown periodically to avoid crowding) */}
                      {(item.day === 1 || item.day % 5 === 0 || item.day === daysInMonth) && (
                        <span className="text-[10px] text-slate-400 mt-1 select-none">
                          {item.day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
