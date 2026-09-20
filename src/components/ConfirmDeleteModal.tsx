import { AlertTriangle } from 'lucide-react';
import { Expense } from '../types';
import { formatRupiah, formatTanggal } from '../utils/formatters';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  expense: Expense | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  expense,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen || !expense) return null;

  return (
    <div
      id="confirm-delete-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        id="confirm-delete-modal"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-delete-title" className="text-lg font-semibold text-slate-900">
              Hapus Data Belanja?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus catatan belanjaan ini? Tindakan ini akan menghapus data
              secara permanen dari riwayat keluarga dan Google Sheets.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-sm">
              <div className="flex justify-between font-medium text-slate-800">
                <span>{expense.merchant}</span>
                <span className="text-rose-600">{formatRupiah(expense.amount)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 flex justify-between">
                <span>{formatTanggal(expense.date)} • {expense.category}</span>
                <span>Oleh: {expense.memberName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
