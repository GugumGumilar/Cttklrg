import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit3, ShoppingBag } from 'lucide-react';
import { Expense, ExpenseCategory, FamilyMember } from '../types';
import { ALL_CATEGORIES, formatRupiah } from '../utils/formatters';
import { useToast } from './Toast';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  members: FamilyMember[];
  activeMemberId: string;
  initialData?: Expense | null;
}

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSaveExpense,
  members,
  activeMemberId,
  initialData,
}: ExpenseFormModalProps) {
  const toast = useToast();
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('Belanja Bulanan & Sembako');
  const [memberId, setMemberId] = useState(activeMemberId);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ name: string; qty?: number; price?: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setMerchant(initialData.merchant);
      setDate(initialData.date);
      setAmount(initialData.amount);
      setCategory(initialData.category);
      setMemberId(initialData.memberId || activeMemberId);
      setNotes(initialData.notes || '');
      setItems(initialData.items || []);
    } else {
      setMerchant('');
      setDate(new Date().toISOString().split('T')[0]);
      setAmount(0);
      setCategory('Belanja Bulanan & Sembako');
      setMemberId(activeMemberId);
      setNotes('');
      setItems([]);
    }
  }, [initialData, activeMemberId, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { name: '', qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'name' | 'qty' | 'price', value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);

    // If all items have prices, optionally calculate total
    const calculatedSum = updated.reduce((acc, curr) => acc + (Number(curr.price) || 0) * (Number(curr.qty) || 1), 0);
    if (calculatedSum > 0 && (!amount || amount === 0)) {
      setAmount(calculatedSum);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim()) {
      toast.error('Silakan masukkan nama toko atau keperluan belanja');
      return;
    }
    if (amount <= 0) {
      toast.error('Total nominal pengeluaran harus lebih besar dari Rp 0');
      return;
    }

    const selectedMember = members.find((m) => m.id === memberId) || members[0];

    setIsSaving(true);
    try {
      await onSaveExpense(
        {
          merchant: merchant.trim(),
          date,
          amount: Number(amount),
          category,
          memberId: selectedMember?.id || 'keluarga',
          memberName: selectedMember?.name || 'Keluarga',
          notes: notes.trim(),
          items: items.filter((it) => it.name.trim().length > 0),
        },
        initialData?.id
      );
      toast.success(initialData ? 'Perubahan belanjaan berhasil disimpan!' : 'Catatan belanjaan berhasil ditambahkan!');
      onClose();
    } catch (err: any) {
      toast.error(`Gagal menyimpan data: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="expense-form-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="expense-form-modal"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              {initialData ? <Edit3 className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {initialData ? 'Ubah Catatan Belanja' : 'Catat Belanja Manual'}
              </h2>
              <p className="text-xs text-slate-500">
                Input pengeluaran belanja keluarga yang akan disinkronkan ke Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Toko / Merchant / Keperluan *
              </label>
              <input
                type="text"
                required
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Contoh: Super Indo, Pasar Pagi, Bensin Pertamax"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Belanja *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total Nominal (Rp) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {amount > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                  {formatRupiah(amount)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kategori Belanja
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dibayar Oleh
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {members.map((mem) => (
                  <option key={mem.id} value={mem.id}>
                    {mem.name} ({mem.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Stok bahan masak 1 minggu"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Optional itemized breakdown */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                Rincian Barang Belanjaan (Opsional)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Baris Barang
              </button>
            </div>

            {items.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      placeholder="Nama barang (cth: Minyak Goreng 2L)"
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.qty || 1}
                      onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                      placeholder="Qty"
                      className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      value={it.price || ''}
                      onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                      placeholder="Harga"
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-expense"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : initialData ? 'Perbarui Belanjaan' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
