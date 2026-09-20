import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Upload, Sparkles, X, Check, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory, FamilyMember, ParsedReceiptData } from '../types';
import { ALL_CATEGORIES, formatRupiah } from '../utils/formatters';
import { useToast } from './Toast';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  members: FamilyMember[];
  activeMemberId: string;
}

// Helper to compress image on client-side before sending to server/Vercel
function compressReceiptImage(file: File, maxDim = 1280, quality = 0.85): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64: compressed, mimeType: 'image/jpeg' });
        } else {
          resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
        }
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  onSaveExpense,
  members,
  activeMemberId,
}: ReceiptScannerModalProps) {
  const toast = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Parsed and editable fields
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('Belanja Bulanan & Sembako');
  const [memberId, setMemberId] = useState(activeMemberId);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ name: string; qty?: number; price?: number }[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setIsScanning(true);

    try {
      // Compress image client-side to ensure fast upload & fit within serverless limits
      const { base64, mimeType: compressedMime } = await compressReceiptImage(file);
      if (!base64) {
        throw new Error('Gagal memuat file gambar');
      }

      setImagePreview(base64);
      setMimeType(compressedMime);
      setHasScanned(false);

      // Trigger OCR
      await performReceiptScan(base64, compressedMime);
    } catch (err: any) {
      setScanError(err.message || 'Gagal membaca berkas gambar.');
      setHasScanned(true);
      setIsScanning(false);
    }
  };

  const performReceiptScan = async (base64Img: string, mime: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: mime,
        }),
      });

      // Safely parse text first to prevent "Unexpected end of JSON input"
      let resData: any = null;
      try {
        const rawText = await response.text();
        if (rawText && rawText.trim()) {
          try {
            resData = JSON.parse(rawText);
          } catch {
            // response was not JSON
          }
        }
      } catch {
        // failed to read response body
      }

      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          throw new Error('Layanan AI scanner backend belum aktif di platform hosting ini atau kunci GEMINI_API_KEY belum diisi di Environment Variables Vercel.');
        }
        if (response.status === 413) {
          throw new Error('Ukuran foto terlalu besar untuk diproses server.');
        }
        throw new Error(resData?.error || `Server mengembalikan status ${response.status}`);
      }

      if (!resData || !resData.success) {
        throw new Error(resData?.error || 'Format respon pemindaian bon tidak sesuai.');
      }

      const data: ParsedReceiptData = resData.data;
      setMerchant(data.merchant || '');
      setDate(data.date || new Date().toISOString().split('T')[0]);
      setTotal(data.total || 0);
      setCategory(data.category || 'Belanja Bulanan & Sembako');
      setItems(data.items || []);
      setNotes(`Dipindai otomatis dari struk ${data.merchant || 'belanja'}`);
      setHasScanned(true);
    } catch (err: any) {
      console.warn('Scan error caught safely:', err);
      setScanError(err.message || 'Terjadi gangguan saat memindai foto.');
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  };

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
  };

  const handleSave = async () => {
    if (!merchant.trim()) {
      toast.error('Mohon isi nama toko atau tempat belanja');
      return;
    }
    if (total <= 0) {
      toast.error('Total belanjaan harus lebih besar dari Rp 0');
      return;
    }

    const selectedMember = members.find((m) => m.id === memberId) || members[0];

    setIsSaving(true);
    try {
      await onSaveExpense({
        merchant: merchant.trim(),
        date,
        total: Number(total),
        amount: Number(total),
        category,
        memberId: selectedMember?.id || 'keluarga',
        memberName: selectedMember?.name || 'Keluarga',
        notes,
        items: items.filter((it) => it.name.trim().length > 0),
        receiptImage: imagePreview || undefined,
      } as any);

      toast.success('Hasil scan struk berhasil disimpan!');
      onClose();
    } catch (err: any) {
      toast.error(`Gagal menyimpan belanjaan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="receipt-scanner-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="receipt-scanner-modal"
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pindai Foto Bon Belanja</h2>
              <p className="text-xs text-slate-500">AI Gemini membaca otomatis item, harga, dan total belanjaan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Upload or Camera Selection Area */}
          {!imagePreview ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-emerald-400 transition-colors bg-slate-50/30">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="text-base font-medium text-slate-900">Unggah atau Foto Struk Belanja</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Dukung struk Indomaret, Alfamart, Superindo, supermarket, pasar, hingga restoran
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  id="btn-take-photo"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Gunakan Kamera
                </button>
                <button
                  type="button"
                  id="btn-upload-file"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Pilih File Galeri
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Preview with Scanning Overlay */}
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 max-h-56 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Bon Belanja"
                  className="max-h-56 object-contain opacity-90"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                    <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
                    <span className="text-sm font-medium">Membaca Bon Belanja dengan AI...</span>
                    <span className="text-xs text-slate-300 mt-0.5">Mengekstrak tanggal, toko, item & total</span>
                  </div>
                )}

                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setHasScanned(false);
                    }}
                    className="rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                    title="Ganti Foto"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {scanError && (
                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-sm text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Perhatian: </span>
                    <span>{scanError} Anda tetap dapat mengisi data secara manual di bawah.</span>
                  </div>
                </div>
              )}

              {/* Editable Form after AI Scan */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Hasil Pembacaan Bon (Bisa Diedit)
                  </h4>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    Cek & Koreksi Bila Perlu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Toko / Tempat Belanja *
                    </label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Contoh: Indomaret, Super Indo"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal Transaksi *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Total Belanjaan (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-semibold text-slate-400">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={total || ''}
                        onChange={(e) => setTotal(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kategori Pengeluaran
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
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
                      Dibayar Oleh (Anggota Keluarga)
                    </label>
                    <select
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      {members.map((mem) => (
                        <option key={mem.id} value={mem.id}>
                          {mem.name} ({mem.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Catatan Tambahan
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Belanja mingguan"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Itemized list extracted from receipt */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-700">
                      Rincian Barang yang Terbaca ({items.length} item)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Item
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Tidak ada rincian item atau struk langsung mencatat total.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="Nama barang"
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
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <div>
            {imagePreview && total > 0 && (
              <span className="text-xs text-slate-500">
                Total: <strong className="text-slate-900 font-semibold">{formatRupiah(total)}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            {imagePreview && (
              <button
                type="button"
                id="btn-save-scanned-expense"
                onClick={handleSave}
                disabled={isSaving || isScanning}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan ke Belanja Keluarga'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
