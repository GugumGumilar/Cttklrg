import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { findExistingFamilySpreadsheets, createFamilySpreadsheet, SheetInfo } from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  currentSheet: SheetInfo | null;
  onSelectSheet: (sheet: SheetInfo) => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
}

export default function GoogleSheetsModal({
  isOpen,
  onClose,
  user,
  accessToken,
  currentSheet,
  onSelectSheet,
  onSignInWithGoogle,
  onSignOut,
  onTriggerSync,
  isSyncing,
}: GoogleSheetsModalProps) {
  const [existingSheets, setExistingSheets] = useState<SheetInfo[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [manualSheetId, setManualSheetId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveSheets();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const loadDriveSheets = async () => {
    if (!accessToken) return;
    setIsLoadingSheets(true);
    setErrorMsg(null);
    try {
      const sheets = await findExistingFamilySpreadsheets(accessToken);
      setExistingSheets(sheets);
    } catch (err: any) {
      console.warn('Failed loading sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleCreateNew = async () => {
    if (!accessToken) return;
    setIsCreatingSheet(true);
    setErrorMsg(null);
    try {
      const newSheet = await createFamilySpreadsheet(accessToken);
      onSelectSheet(newSheet);
      await loadDriveSheets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Sheet baru');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    try {
      await onSignInWithGoogle();
    } catch (e) {
      console.warn('Google sign-in action error:', e);
    }
  };

  const handleSignOutClick = async () => {
    try {
      await onSignOut();
    } catch (e) {
      console.warn('Google sign-out action error:', e);
    }
  };

  const handleTriggerSyncClick = async () => {
    try {
      await onTriggerSync();
    } catch (e) {
      console.warn('Trigger sync action error:', e);
    }
  };

  const handleApplyManualSheet = () => {
    if (!manualSheetId.trim()) return;
    let cleanId = manualSheetId.trim();
    // Support full URL extraction
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanId = match[1];
    }
    onSelectSheet({
      id: cleanId,
      name: 'Google Spreadsheet Terhubung',
      url: `https://docs.google.com/spreadsheets/d/${cleanId}`,
    });
    setManualSheetId('');
  };

  return (
    <div
      id="sheets-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="sheets-modal"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pengaturan Basis Data Google Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Sinkronisasi pengeluaran keluarga langsung ke akun Google Anda
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

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Auth Section */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Status Akun Google
            </h4>

            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-9 w-9 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      {user.displayName || 'Pengguna Google'}
                    </span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-3">
                <p className="text-xs text-slate-600">
                  Hubungkan dengan akun Google Anda untuk menyimpan dan membaca data langsung dari Google Sheets.
                </p>

                {/* Official Google Sign-in Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  className="gsi-material-button mx-auto flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-slate-700">Masuk dengan Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Current Active Spreadsheet */}
          {user && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Spreadsheet Terhubung Saat Ini:</span>
                  </div>
                  {currentSheet && (
                    <a
                      href={currentSheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
                    >
                      Buka di Tab Baru
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {currentSheet ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200/80">
                    <h4 className="text-sm font-bold text-slate-900">{currentSheet.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      ID: {currentSheet.id}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    Belum ada spreadsheet yang dipilih. Buat spreadsheet baru di bawah ini.
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTriggerSyncClick}
                    disabled={isSyncing || !currentSheet}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={isCreatingSheet}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingSheet ? 'Membuat...' : '+ Buat Spreadsheet Baru'}
                  </button>
                </div>
              </div>

              {/* Existing Sheets from Drive */}
              {existingSheets.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Pilih File Spreadsheet dari Google Drive:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {existingSheets.map((sh) => (
                      <div
                        key={sh.id}
                        onClick={() => onSelectSheet(sh)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition-colors ${
                          currentSheet?.id === sh.id
                            ? 'bg-emerald-50 border-emerald-300 font-medium text-emerald-900'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderOpen className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{sh.name}</span>
                        </div>
                        {currentSheet?.id === sh.id && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                            Aktif
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Input Sheet ID or URL */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Atau masukkan URL / ID Google Spreadsheet lain:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSheetId}
                    onChange={(e) => setManualSheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualSheet}
                    disabled={!manualSheetId.trim()}
                    className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40 transition-colors"
                  >
                    Gunakan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
