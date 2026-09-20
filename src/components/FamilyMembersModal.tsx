import { useState } from 'react';
import { Users, Copy, Check, Plus, Trash2, Shield, X, Radio } from 'lucide-react';
import { FamilyMember } from '../types';
import { copyToClipboard } from '../utils/storage';
import { useToast } from './Toast';

interface FamilyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyCode: string;
  onChangeFamilyCode: (code: string) => void;
  members: FamilyMember[];
  onUpdateMembers: (newMembers: FamilyMember[]) => void;
  activeMemberId: string;
  onSelectActiveMember: (memberId: string) => void;
}

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#64748B', // Slate
];

export default function FamilyMembersModal({
  isOpen,
  onClose,
  familyCode,
  onChangeFamilyCode,
  members,
  onUpdateMembers,
  activeMemberId,
  onSelectActiveMember,
}: FamilyMembersModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Anggota');
  const [newMemberColor, setNewMemberColor] = useState('#8B5CF6');
  const [inputFamilyCode, setInputFamilyCode] = useState(familyCode);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(familyCode);
    if (ok) {
      setCopied(true);
      toast.success('Kode keluarga disalin!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(`Kode keluarga: ${familyCode}`);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}?family=${encodeURIComponent(familyCode)}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success('Tautan undangan keluarga disalin!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(`Tautan keluarga: ${url}`);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMem: FamilyMember = {
      id: `member-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Anggota',
      color: newMemberColor,
    };

    onUpdateMembers([...members, newMem]);
    toast.success(`Anggota "${newMem.name}" berhasil ditambahkan`);
    setNewMemberName('');
    setNewMemberRole('Anggota');
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      toast.error('Minimal harus ada 1 anggota keluarga dalam daftar');
      return;
    }
    const updated = members.filter((m) => m.id !== id);
    onUpdateMembers(updated);
    if (activeMemberId === id) {
      onSelectActiveMember(updated[0].id);
    }
  };

  const handleApplyFamilyCode = () => {
    if (!inputFamilyCode.trim()) return;
    onChangeFamilyCode(inputFamilyCode.trim().toLowerCase().replace(/\s+/g, '-'));
  };

  return (
    <div
      id="family-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="family-modal"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Anggota Keluarga & Sinkronisasi Real-Time
              </h2>
              <p className="text-xs text-slate-500">
                Kelola profil keluarga dan hubungkan HP anggota lain
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

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Family Code & Share */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
                Kode Ruang Keluarga Real-Time:
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Tautan Disalin!' : 'Salin Tautan Gabung'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputFamilyCode}
                onChange={(e) => setInputFamilyCode(e.target.value)}
                placeholder="kode-keluarga"
                className="flex-1 rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-mono font-semibold text-slate-900 focus:outline-hidden"
              />
              {inputFamilyCode !== familyCode && (
                <button
                  type="button"
                  onClick={handleApplyFamilyCode}
                  className="rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-800 transition-colors"
                >
                  Ganti
                </button>
              )}
            </div>

            <p className="text-[11px] text-purple-800/80">
              Buka aplikasi ini di HP Ayah, Ibu, atau Anak dengan kode ruang yang sama. Setiap ada input atau bon belanja baru, semua HP keluarga akan langsung ter-update secara otomatis!
            </p>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Daftar Anggota Keluarga ({members.length})
            </h4>

            <div className="space-y-2">
              {members.map((mem) => {
                const isActive = activeMemberId === mem.id;

                return (
                  <div
                    key={mem.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-300'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold shadow-xs"
                        style={{ backgroundColor: mem.color }}
                      >
                        {mem.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{mem.name}</span>
                          {isActive && (
                            <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{mem.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveMember(mem.id)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Pilih Saya
                        </button>
                      )}
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(mem.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus Anggota"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Member Form */}
          <form onSubmit={handleAddMember} className="pt-3 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700">
              + Tambah Anggota Keluarga Baru
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nama (cth: Nenek, Adik Bungsu)"
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="text"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                placeholder="Peran (cth: Anak, Ibu)"
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Color selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Warna Profil:</span>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewMemberColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full transition-transform ${
                      newMemberColor === c ? 'scale-125 ring-2 ring-slate-800' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={!newMemberName.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
