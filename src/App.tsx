import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Plus,
  FileSpreadsheet,
  Users,
  Radio,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import Navbar from './components/Navbar';
import BudgetSummary from './components/BudgetSummary';
import ExpenseCharts from './components/ExpenseCharts';
import ExpenseList from './components/ExpenseList';
import ReceiptScannerModal from './components/ReceiptScannerModal';
import ExpenseFormModal from './components/ExpenseFormModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import GoogleSheetsModal from './components/GoogleSheetsModal';
import FamilyMembersModal from './components/FamilyMembersModal';
import { useToast } from './components/Toast';
import { safeStorage } from './utils/storage';
import { Expense, FamilyMember, SyncEvent } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessTokenInMemory,
} from './services/firebaseAuth';
import {
  createFamilySpreadsheet,
  findExistingFamilySpreadsheets,
  readExpensesFromSheet,
  appendExpenseToSheet,
  syncAllExpensesToSheet,
  SheetInfo,
} from './services/googleSheets';
import { formatRupiah } from './utils/formatters';

// Default Indonesian family members
const DEFAULT_MEMBERS: FamilyMember[] = [
  { id: 'ayah', name: 'Ayah', role: 'Kepala Keluarga', color: '#2563EB' },
  { id: 'ibu', name: 'Ibu', role: 'Pengatur Keuangan', color: '#EC4899' },
  { id: 'kakak', name: 'Kakak', role: 'Anak Pertama', color: '#10B981' },
  { id: 'adik', name: 'Adik', role: 'Anak Kedua', color: '#F59E0B' },
];

// Realistic initial Indonesian family shopping expenses
const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    merchant: 'Super Indo Swalayan',
    category: 'Belanja Bulanan & Sembako',
    amount: 425000,
    memberId: 'ibu',
    memberName: 'Ibu',
    notes: 'Belanja mingguan: Beras, minyak goreng, daging ayam, sayuran',
    items: [
      { name: 'Beras Premium 5kg', qty: 1, price: 74000 },
      { name: 'Minyak Goreng 2L', qty: 2, price: 36000 },
      { name: 'Daging Ayam Fillet 1kg', qty: 1, price: 58000 },
      { name: 'Telur Ayam 1kg', qty: 1, price: 29000 },
      { name: 'Sayur Mayur & Bumbu', qty: 1, price: 65000 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    syncedToSheet: true,
  },
  {
    id: 'exp-2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    merchant: 'SPBU Pertamina',
    category: 'Transportasi & Bensin',
    amount: 150000,
    memberId: 'ayah',
    memberName: 'Ayah',
    notes: 'Isi Pertamax motor dan mobil untuk kerja',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    syncedToSheet: true,
  },
  {
    id: 'exp-3',
    date: new Date().toISOString().split('T')[0],
    merchant: 'Indomaret Point',
    category: 'Makanan & Minuman',
    amount: 72000,
    memberId: 'kakak',
    memberName: 'Kakak',
    notes: 'Beli roti, susu UHT untuk adik, dan camilan belajar',
    items: [
      { name: 'Susu UHT 1L', qty: 2, price: 19500 },
      { name: 'Roti Tawar Gandum', qty: 1, price: 18000 },
      { name: 'Air Mineral 1.5L', qty: 1, price: 7000 },
    ],
    createdAt: new Date().toISOString(),
    syncedToSheet: true,
  },
  {
    id: 'exp-4',
    date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    merchant: 'Apotek Kimia Farma',
    category: 'Kesehatan & Obat',
    amount: 98000,
    memberId: 'ibu',
    memberName: 'Ibu',
    notes: 'Vitamin C anak dan minyak kayu putih',
    items: [
      { name: 'Multivitamin Syrup Anak', qty: 1, price: 55000 },
      { name: 'Minyak Kayu Putih 120ml', qty: 1, price: 43000 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    syncedToSheet: true,
  },
  {
    id: 'exp-5',
    date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    merchant: 'Token Listrik PLN',
    category: 'Listrik, Air & Tagihan',
    amount: 250000,
    memberId: 'ayah',
    memberName: 'Ayah',
    notes: 'Beli pulsa listrik rumah bulanan',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    syncedToSheet: true,
  },
];

export default function App() {
  const toast = useToast();

  // Family identification
  const [familyCode, setFamilyCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('family');
      if (fromUrl) return fromUrl.toLowerCase().replace(/\s+/g, '-');
    } catch {
      // ignore URL parsing in restricted environment
    }
    return safeStorage.getItem('family_code') || 'keluarga-kita-2026';
  });

  // Core financial state
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const cached = safeStorage.getItem(`expenses_${familyCode}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return INITIAL_EXPENSES;
      }
    }
    return INITIAL_EXPENSES;
  });

  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const cached = safeStorage.getItem(`members_${familyCode}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return DEFAULT_MEMBERS;
      }
    }
    return DEFAULT_MEMBERS;
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return safeStorage.getItem('active_member_id') || 'ayah';
  });

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const cached = safeStorage.getItem(`budget_${familyCode}`);
    return cached ? Number(cached) : 6000000;
  });

  // Selected Month (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Authentication & Google Sheets
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentSheet, setCurrentSheet] = useState<SheetInfo | null>(() => {
    const cached = safeStorage.getItem(`sheet_${familyCode}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Real-time synchronization states
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveNotification, setLiveNotification] = useState<{
    message: string;
    type: 'ADD' | 'UPDATE' | 'DELETE' | 'BUDGET';
    time: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Active member object
  const activeMember = useMemo(() => {
    return members.find((m) => m.id === activeMemberId) || members[0] || DEFAULT_MEMBERS[0];
  }, [members, activeMemberId]);

  // Available months from current expenses
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthStr);
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        monthSet.add(e.date.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [expenses, currentMonthStr]);

  // Monthly metrics
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const totalSpentThisMonth = useMemo(() => {
    return monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyExpenses]);

  // Persist locally
  useEffect(() => {
    safeStorage.setItem('family_code', familyCode);
    safeStorage.setItem(`expenses_${familyCode}`, JSON.stringify(expenses));
    safeStorage.setItem(`members_${familyCode}`, JSON.stringify(members));
    safeStorage.setItem(`budget_${familyCode}`, monthlyBudget.toString());
    if (currentSheet) {
      safeStorage.setItem(`sheet_${familyCode}`, JSON.stringify(currentSheet));
    }
  }, [familyCode, expenses, members, monthlyBudget, currentSheet]);

  useEffect(() => {
    safeStorage.setItem('active_member_id', activeMemberId);
  }, [activeMemberId]);

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
        setAccessTokenInMemory(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAccessTokenInMemory(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch server family state & listen to SSE stream for live updates
  useEffect(() => {
    let sseSource: EventSource | null = null;
    let isCancelled = false;

    // Fetch initial state from server
    fetch(`/api/family/${familyCode}/state`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data) {
          if (Array.isArray(data.expenses) && data.expenses.length > 0) {
            setExpenses(data.expenses);
          }
          if (data.budget) {
            setMonthlyBudget(data.budget);
          }
          if (Array.isArray(data.members) && data.members.length > 0) {
            setMembers(data.members);
          }
          if (data.sheetId && !currentSheet) {
            setCurrentSheet({
              id: data.sheetId,
              name: data.sheetName || 'Catatan Belanja Keluarga',
              url: `https://docs.google.com/spreadsheets/d/${data.sheetId}`,
            });
          }
        }
      })
      .catch((err) => console.warn('Server fetch error:', err));

    // Connect to Server-Sent Events for real-time live synchronization
    try {
      sseSource = new EventSource(`/api/family/${familyCode}/events`);

      sseSource.onopen = () => {
        setIsLiveConnected(true);
      };

      sseSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'INIT') {
            setIsLiveConnected(true);
            return;
          }

          // Trigger live notification
          let notificationText = '';
          if (parsed.type === 'ADD' && parsed.expense) {
            notificationText = `${parsed.memberName || 'Anggota'} menambahkan belanja ${parsed.expense.merchant} (${formatRupiah(parsed.expense.amount)})`;
            setExpenses((prev) => {
              if (prev.some((e) => e.id === parsed.expense.id)) return prev;
              return [parsed.expense, ...prev];
            });
          } else if (parsed.type === 'UPDATE' && parsed.expense) {
            notificationText = `${parsed.memberName || 'Anggota'} memperbarui belanjaan ${parsed.expense.merchant}`;
            setExpenses((prev) =>
              prev.map((e) => (e.id === parsed.expense.id ? parsed.expense : e))
            );
          } else if (parsed.type === 'DELETE' && parsed.expenseId) {
            notificationText = `${parsed.memberName || 'Anggota'} menghapus 1 data belanjaan`;
            setExpenses((prev) => prev.filter((e) => e.id !== parsed.expenseId));
          } else if (parsed.type === 'BUDGET_UPDATE' && parsed.budget) {
            notificationText = `${parsed.memberName || 'Anggota'} memperbarui target anggaran menjadi ${formatRupiah(parsed.budget)}`;
            setMonthlyBudget(parsed.budget);
          }

          if (notificationText) {
            setLiveNotification({
              message: notificationText,
              type: parsed.type,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            });
            // Auto-hide notification after 5 seconds
            setTimeout(() => {
              setLiveNotification(null);
            }, 5000);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      sseSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (err) {
      console.warn('SSE connect error:', err);
    }

    return () => {
      isCancelled = true;
      if (sseSource) {
        sseSource.close();
      }
    };
  }, [familyCode]);

  // Sync state changes to server and Google Sheets
  const broadcastSync = async (
    syncType: SyncEvent['type'],
    payload: {
      updatedExpenses?: Expense[];
      updatedBudget?: number;
      updatedMembers?: FamilyMember[];
      affectedExpense?: Expense;
      expenseId?: string;
    }
  ) => {
    try {
      await fetch(`/api/family/${familyCode}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: payload.updatedExpenses ?? expenses,
          budget: payload.updatedBudget ?? monthlyBudget,
          members: payload.updatedMembers ?? members,
          sheetId: currentSheet?.id,
          sheetName: currentSheet?.name,
          event: {
            type: syncType,
            memberName: activeMember.name,
            expense: payload.affectedExpense,
            expenseId: payload.expenseId,
            budget: payload.updatedBudget,
          },
        }),
      });
    } catch (err) {
      console.warn('Broadcast sync error:', err);
    }
  };

  // Save new or edited expense
  const handleSaveExpense = async (
    expenseData: Omit<Expense, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      // Edit existing
      const updatedList = expenses.map((e) =>
        e.id === existingId
          ? {
              ...e,
              ...expenseData,
              syncedToSheet: true,
            }
          : e
      );
      setExpenses(updatedList);
      const updatedExpense = updatedList.find((e) => e.id === existingId)!;

      await broadcastSync('UPDATE', {
        updatedExpenses: updatedList,
        affectedExpense: updatedExpense,
      });

      // Sync to Google Sheets if connected
      if (accessToken && currentSheet) {
        syncAllExpensesToSheet(accessToken, currentSheet.id, updatedList).catch(console.warn);
      }
    } else {
      // Add new
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
        syncedToSheet: true,
      };

      const updatedList = [newExp, ...expenses];
      setExpenses(updatedList);

      await broadcastSync('ADD', {
        updatedExpenses: updatedList,
        affectedExpense: newExp,
      });

      // Append to Google Sheets directly
      if (accessToken && currentSheet) {
        appendExpenseToSheet(accessToken, currentSheet.id, newExp).catch(console.warn);
      }
    }
  };

  // Trigger Delete (opens confirmation modal first as required by Workspace skill)
  const handlePromptDelete = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);

    try {
      const expId = deletingExpense.id;
      const updatedList = expenses.filter((e) => e.id !== expId);
      setExpenses(updatedList);

      await broadcastSync('DELETE', {
        updatedExpenses: updatedList,
        expenseId: expId,
      });

      // Update Google Sheet if connected
      if (accessToken && currentSheet) {
        await syncAllExpensesToSheet(accessToken, currentSheet.id, updatedList);
      }
      setDeletingExpense(null);
      toast.success('Catatan belanjaan berhasil dihapus');
    } catch (err: any) {
      toast.error(`Gagal menghapus catatan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Update budget target
  const handleUpdateBudget = async (newBudget: number) => {
    setMonthlyBudget(newBudget);
    await broadcastSync('BUDGET_UPDATE', { updatedBudget: newBudget });
  };

  // Manual Trigger Sync with Google Sheets
  const handleTriggerSheetsSync = async () => {
    if (!accessToken || !currentSheet) {
      setIsSheetsModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Read sheet rows
      const sheetExpenses = await readExpensesFromSheet(accessToken, currentSheet.id);

      if (sheetExpenses.length > 0) {
        // Merge with local expenses by ID
        const mergedMap = new Map<string, Expense>();
        sheetExpenses.forEach((e) => mergedMap.set(e.id, e));
        expenses.forEach((e) => {
          if (!mergedMap.has(e.id)) {
            mergedMap.set(e.id, e);
          }
        });

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setExpenses(mergedList);
        await syncAllExpensesToSheet(accessToken, currentSheet.id, mergedList);
        await broadcastSync('UPDATE', { updatedExpenses: mergedList });
      } else {
        // Sheet empty, push local expenses
        await syncAllExpensesToSheet(accessToken, currentSheet.id, expenses);
      }

      toast.success('Sinkronisasi data dengan Google Sheets berhasil!');
    } catch (err: any) {
      toast.error(`Gangguan saat sinkronisasi Sheets: ${err.message || 'Terjadi kendala jaringan'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Sign-In Handler
  const handleSignInGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setAccessTokenInMemory(res.accessToken);
        toast.success(`Berhasil terhubung sebagai ${res.user.displayName || res.user.email}`);

        // Check if there is an existing spreadsheet in drive
        const sheets = await findExistingFamilySpreadsheets(res.accessToken);
        if (sheets.length > 0 && !currentSheet) {
          setCurrentSheet(sheets[0]);
        } else if (!currentSheet) {
          // Auto create initial family spreadsheet
          const created = await createFamilySpreadsheet(res.accessToken);
          setCurrentSheet(created);
          // Initial push
          await syncAllExpensesToSheet(res.accessToken, created.id, expenses);
        }
      }
    } catch (err: any) {
      toast.error(`Gagal login Google: ${err.message || 'Proses otentikasi dibatalkan'}`);
    }
  };

  const handleSignOutGoogle = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setAccessTokenInMemory(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans antialiased">
      {/* Real-time Notification Banner */}
      {liveNotification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl border border-slate-800 animate-slide-up">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="font-semibold block text-emerald-300">
              Update Real-Time Keluarga ({liveNotification.time})
            </span>
            <span className="text-slate-200">{liveNotification.message}</span>
          </div>
          <button
            onClick={() => setLiveNotification(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        familyCode={familyCode}
        members={members}
        activeMember={activeMember}
        onSelectActiveMember={setActiveMemberId}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        currentSheet={currentSheet}
        isLiveConnected={isLiveConnected}
      />

      {/* Main Content Layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Action Bar: Pindai Bon & Catat Manual */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Pencatatan Belanja Keluarga Cerdas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Pantau Anggaran & Pengeluaran Keluarga
            </h2>
            <p className="text-xs sm:text-sm text-emerald-50 opacity-90">
              Cukup foto bon belanjaan Anda atau catat manual. Data langsung tersinkronisasi otomatis
              ke Google Sheets dan HP semua anggota keluarga.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Action 1: Scan Bon */}
            <button
              type="button"
              id="btn-open-scanner"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-md hover:bg-emerald-50 hover:shadow-lg transition-all"
            >
              <Camera className="h-4 w-4 text-emerald-600" />
              Foto Bon Belanja
            </button>

            {/* Primary Action 2: Catat Manual */}
            <button
              type="button"
              id="btn-open-manual-form"
              onClick={() => {
                setEditingExpense(null);
                setIsManualInputOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-white/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-950/60 transition-all backdrop-blur-xs"
            >
              <Plus className="h-4 w-4" />
              Catat Manual
            </button>

            {/* Google Sheets Link / Trigger */}
            {currentSheet ? (
              <a
                href={currentSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-white/25 transition-colors backdrop-blur-xs"
                title="Buka Google Spreadsheet"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden lg:inline">Buka Spreadsheet</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-white/25 transition-colors backdrop-blur-xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Hubungkan Sheets
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Monthly Budget Tracker */}
        <BudgetSummary
          monthlyBudget={monthlyBudget}
          onUpdateBudget={handleUpdateBudget}
          totalSpentThisMonth={totalSpentThisMonth}
          totalTransactionsThisMonth={monthlyExpenses.length}
          selectedMonth={selectedMonth}
          onChangeMonth={setSelectedMonth}
          availableMonths={availableMonths}
        />

        {/* Section 2: Visual Charts & Analytics */}
        <ExpenseCharts
          expenses={expenses}
          members={members}
          selectedMonth={selectedMonth}
        />

        {/* Section 3: Detailed Expenses List */}
        <ExpenseList
          expenses={expenses}
          members={members}
          selectedMonth={selectedMonth}
          onEditExpense={(exp) => {
            setEditingExpense(exp);
            setIsManualInputOpen(true);
          }}
          onDeleteExpense={handlePromptDelete}
        />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Pencatatan Belanja Keluarga</span>
            <span>•</span>
            <span>Basis Data Google Sheets</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Kode Ruang: #{familyCode}</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsFamilyModalOpen(true)}
              className="text-emerald-600 hover:underline font-medium"
            >
              Undang Anggota Lain
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Receipt Scanner Modal (Gemini AI OCR) */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveExpense={handleSaveExpense}
        members={members}
        activeMemberId={activeMemberId}
      />

      {/* 2. Manual Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isManualInputOpen}
        onClose={() => {
          setIsManualInputOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={handleSaveExpense}
        members={members}
        activeMemberId={activeMemberId}
        initialData={editingExpense}
      />

      {/* 3. Confirm Delete Modal (Workspace API Compliance) */}
      <ConfirmDeleteModal
        isOpen={!!deletingExpense}
        expense={deletingExpense}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />

      {/* 4. Google Sheets Connection Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={user}
        accessToken={accessToken}
        currentSheet={currentSheet}
        onSelectSheet={(sh) => {
          setCurrentSheet(sh);
          // Sync server state with sheet
          broadcastSync('UPDATE', { updatedExpenses: expenses });
        }}
        onSignInWithGoogle={handleSignInGoogle}
        onSignOut={handleSignOutGoogle}
        onTriggerSync={handleTriggerSheetsSync}
        isSyncing={isSyncing}
      />

      {/* 5. Family Members & Real-time Room Modal */}
      <FamilyMembersModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        familyCode={familyCode}
        onChangeFamilyCode={(newCode) => {
          setFamilyCode(newCode);
          window.history.replaceState(null, '', `?family=${newCode}`);
        }}
        members={members}
        onUpdateMembers={(newMems) => {
          setMembers(newMems);
          broadcastSync('UPDATE', { updatedMembers: newMems });
        }}
        activeMemberId={activeMemberId}
        onSelectActiveMember={setActiveMemberId}
      />
    </div>
  );
}
