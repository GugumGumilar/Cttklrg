import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Receipt,
  Eye,
  ShoppingBag,
  ExternalLink,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Expense, ExpenseCategory, FamilyMember } from '../types';
import { ALL_CATEGORIES, CATEGORY_COLORS, formatRupiah, formatTanggal } from '../utils/formatters';

interface ExpenseListProps {
  expenses: Expense[];
  members: FamilyMember[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  selectedMonth: string;
}

export default function ExpenseList({
  expenses,
  members,
  onEditExpense,
  onDeleteExpense,
  selectedMonth,
}: ExpenseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [viewReceiptImage, setViewReceiptImage] = useState<string | null>(null);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Month filter
        if (selectedMonth && !exp.date.startsWith(selectedMonth)) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMerchant = exp.merchant.toLowerCase().includes(q);
          const matchNotes = exp.notes?.toLowerCase().includes(q);
          const matchItems = exp.items?.some((it) => it.name.toLowerCase().includes(q));
          const matchPayer = exp.memberName.toLowerCase().includes(q);
          if (!matchMerchant && !matchNotes && !matchItems && !matchPayer) {
            return false;
          }
        }

        // Category filter
        if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
          return false;
        }

        // Member filter
        if (memberFilter !== 'ALL') {
          if (exp.memberId !== memberFilter && exp.memberName !== memberFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedMonth, searchQuery, categoryFilter, memberFilter]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-6">
      {/* Header & Quick stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Daftar Belanja & Riwayat Transaksi
          </h3>
          <p className="text-xs text-slate-500">
            Menampilkan {filteredExpenses.length} transaksi • Total: {formatRupiah(filteredTotal)}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko, barang, catatan..."
              className="w-48 sm:w-60 rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Member Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Anggota</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ShoppingBag className="mx-auto h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm font-medium">Tidak ada transaksi yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau filter kategori di atas
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredExpenses.map((exp) => {
            const catStyle = CATEGORY_COLORS[exp.category] || {
              bg: 'bg-slate-50',
              text: 'text-slate-700',
              border: 'border-slate-200',
            };
            const memberObj = members.find((m) => m.id === exp.memberId || m.name === exp.memberName);

            return (
              <div
                key={exp.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 hover:bg-slate-50/70 p-2.5 rounded-xl transition-colors"
              >
                {/* Left: Icon, Merchant, Date, Items */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs mt-0.5">
                    {exp.receiptImage ? (
                      <button
                        type="button"
                        onClick={() => setViewReceiptImage(exp.receiptImage!)}
                        className="relative group h-full w-full flex items-center justify-center rounded-xl overflow-hidden"
                        title="Lihat Foto Bon"
                      >
                        <img
                          src={exp.receiptImage}
                          alt="Bon"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    ) : (
                      <Receipt className="h-5 w-5 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {exp.merchant}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        <Tag className="h-3 w-3" />
                        {exp.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>{formatTanggal(exp.date)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ backgroundColor: memberObj?.color || '#64748B' }}
                        />
                        {exp.memberName}
                      </span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400 truncate max-w-xs">"{exp.notes}"</span>
                        </>
                      )}
                    </div>

                    {/* Itemized tags if present */}
                    {exp.items && exp.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {exp.items.slice(0, 3).map((it, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                          >
                            {it.qty ? `${it.qty}x ` : ''}{it.name}
                          </span>
                        ))}
                        {exp.items.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{exp.items.length - 3} item lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900 block">
                      {formatRupiah(exp.amount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Google Sheets
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      title="Ubah Catatan"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      {viewReceiptImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setViewReceiptImage(null)}
        >
          <div className="relative max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white p-2">
            <img
              src={viewReceiptImage}
              alt="Foto Struk"
              className="max-h-[80vh] w-auto rounded-xl object-contain mx-auto"
            />
            <button
              onClick={() => setViewReceiptImage(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
