import {
  ShoppingBag,
  FileSpreadsheet,
  Users,
  Radio,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { FamilyMember } from '../types';
import { SheetInfo } from '../services/googleSheets';

interface NavbarProps {
  familyCode: string;
  members: FamilyMember[];
  activeMember: FamilyMember;
  onSelectActiveMember: (memberId: string) => void;
  onOpenFamilyModal: () => void;
  onOpenSheetsModal: () => void;
  currentSheet: SheetInfo | null;
  isLiveConnected: boolean;
}

export default function Navbar({
  familyCode,
  members,
  activeMember,
  onSelectActiveMember,
  onOpenFamilyModal,
  onOpenSheetsModal,
  currentSheet,
  isLiveConnected,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: App Brand & Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Belanja Keluarga
              </h1>
              {/* Real-time pulse indicator */}
              <div
                onClick={onOpenFamilyModal}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80 cursor-pointer hover:bg-emerald-100/80 transition-colors"
                title={`Terhubung sinkronisasi real-time kode: ${familyCode}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isLiveConnected ? 'animate-ping' : ''}`} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>Live Sync: #{familyCode}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Manajemen Anggaran & Integrasi Google Sheets
            </p>
          </div>
        </div>

        {/* Right: Actions & User Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Sheets Status / Button */}
          <button
            type="button"
            onClick={onOpenSheetsModal}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              currentSheet
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden md:inline">
              {currentSheet ? 'Google Sheets Terhubung' : 'Sambungkan Sheets'}
            </span>
            <span className="md:hidden">Sheets</span>
            {currentSheet && <ExternalLink className="h-3 w-3 text-emerald-600" />}
          </button>

          {/* Active Family Member Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <div className="flex items-center gap-2 pl-2 pr-1">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0 shadow-xs"
                style={{ backgroundColor: activeMember.color }}
              >
                {activeMember.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 leading-tight">Mencatat sbg:</span>
                <select
                  value={activeMember.id}
                  onChange={(e) => onSelectActiveMember(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer -mt-0.5"
                >
                  {members.map((mem) => (
                    <option key={mem.id} value={mem.id}>
                      {mem.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenFamilyModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-1"
              title="Kelola Ruang & Anggota Keluarga"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
