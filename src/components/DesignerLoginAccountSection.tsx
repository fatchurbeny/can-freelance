"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { createDesignerLoginAction, resetPinAction, setUserActiveAction, updateUserUnitAccessAction } from '@/app/actions/auth';

export interface DesignerLoginAccount {
  userId: string;
  userCode: string | null;
  isActive: boolean;
  pinMustChange: boolean;
  lastLoginAt: string | null;
  unitIds: string[];
}

interface UnitOption {
  id: string;
  name: string;
}

interface Props {
  designerId: string;
  account: DesignerLoginAccount | null | undefined;
  productionUnits: UnitOption[];
}

/** Baris "Akun Login" di profil designer: buat akun ID+PIN, reset PIN, nonaktifkan. */
export default function DesignerLoginAccountSection({ designerId, account, productionUnits }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  // Kredensial hanya ditampilkan sekali, tepat setelah dibuat / direset.
  const [editingAccess, setEditingAccess] = useState(false);
  const [issued, setIssued] = useState<{ userCode: string; pin: string } | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Disalin');
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  const create = () =>
    startTransition(async () => {
      const res = await createDesignerLoginAction({ designerId, productionUnitIds: selected });
      if (!res.success || !res.userCode || !res.pin) {
        toast.error(res.error || 'Gagal membuat akun');
        return;
      }
      setIssued({ userCode: res.userCode, pin: res.pin });
      toast.success('Akun login dibuat');
      router.refresh();
    });

  const reset = () =>
    startTransition(async () => {
      if (!account) return;
      const res = await resetPinAction(account.userId);
      if (!res.success || !res.pin) {
        toast.error(res.error || 'Gagal mereset PIN');
        return;
      }
      setIssued({ userCode: account.userCode || '', pin: res.pin });
      toast.success('PIN direset');
      router.refresh();
    });

  const saveAccess = () =>
    startTransition(async () => {
      if (!account) return;
      const res = await updateUserUnitAccessAction(account.userId, selected);
      if (!res.success) {
        toast.error(res.error || 'Gagal menyimpan akses');
        return;
      }
      toast.success('Akses production diperbarui');
      setEditingAccess(false);
      router.refresh();
    });

  const toggleActive = () =>
    startTransition(async () => {
      if (!account) return;
      const res = await setUserActiveAction(account.userId, !account.isActive);
      if (!res.success) {
        toast.error(res.error || 'Gagal mengubah status akun');
        return;
      }
      toast.success(account.isActive ? 'Akun dinonaktifkan' : 'Akun diaktifkan');
      router.refresh();
    });

  const btn =
    'h-9 px-3 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] disabled:opacity-50 cursor-pointer';

  return (
    <div className="flex items-stretch text-xs font-sans min-h-[44px] border-t border-[#f0f0f0] dark:border-[#272a34]">
      <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-start gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
        <KeyRound className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
        <span>Akun Login</span>
      </div>
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-3 bg-white dark:bg-[#0d0e12]">
        {account ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{account.userCode}</span>
              <span className={account.isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                {account.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
              {account.pinMustChange && <span className="text-amber-600 dark:text-amber-400">Belum ganti PIN awal</span>}
              <span className="text-gray-400">
                Login terakhir: {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('id-ID') : 'belum pernah'}
              </span>
            </div>
            {editingAccess ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {productionUnits.map((u) => (
                    <label key={u.id} className={`flex items-center gap-2 border px-3 h-9 cursor-pointer ${selected.includes(u.id) ? 'border-[#ff5e1f] text-[#ff5e1f]' : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-600 dark:text-gray-300'}`}>
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="accent-[#ff5e1f]" />
                      <span className="font-semibold">{u.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" className={btn} disabled={pending || selected.length === 0} onClick={saveAccess}>Simpan akses</button>
                  <button type="button" className={btn} disabled={pending} onClick={() => setEditingAccess(false)}>Batal</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400">
                <span>
                  Akses: {account.unitIds.length === 0
                    ? 'semua production'
                    : account.unitIds.map((id) => productionUnits.find((u) => u.id === id)?.name || id).join(', ')}
                </span>
                {account.unitIds.length > 0 && (
                  <button type="button" className="font-bold uppercase text-[11px] text-gray-600 dark:text-gray-300 hover:text-[#ff5e1f] cursor-pointer" onClick={() => { setSelected(account.unitIds); setEditingAccess(true); }}>
                    Ubah
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" className={btn} disabled={pending} onClick={reset}>Reset PIN</button>
              <button type="button" className={btn} disabled={pending} onClick={toggleActive}>
                {account.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-gray-500 dark:text-gray-400">Belum punya akun. Pilih production yang boleh diakses:</div>
            <div className="flex flex-wrap gap-2">
              {productionUnits.map((u) => (
                <label key={u.id} className={`flex items-center gap-2 border px-3 h-9 cursor-pointer ${selected.includes(u.id) ? 'border-[#ff5e1f] text-[#ff5e1f]' : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-600 dark:text-gray-300'}`}>
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="accent-[#ff5e1f]" />
                  <span className="font-semibold">{u.name}</span>
                </label>
              ))}
            </div>
            <div>
              <button type="button" className={btn} disabled={pending || selected.length === 0} onClick={create}>
                {pending ? 'Membuat…' : 'Buat Akun Login'}
              </button>
            </div>
          </div>
        )}

        <Link href="/user-role" className="self-start text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-[#ff5e1f] dark:text-gray-400">
          Kelola semua user &amp; role →
        </Link>

        {issued && (
          <div className="border border-dashed border-[#ff5e1f]/60 bg-[#ff5e1f]/5 p-3 flex flex-col gap-2">
            <div className="font-bold text-[#ff5e1f]">Catat sekarang — PIN tidak ditampilkan lagi</div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-sm">
              <span>ID: <strong>{issued.userCode}</strong></span>
              <span>PIN awal: <strong>{issued.pin}</strong></span>
              <button type="button" className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:text-[#ff5e1f] cursor-pointer" onClick={() => copy(`ID: ${issued.userCode}\nPIN: ${issued.pin}`)}>
                <Copy className="w-3 h-3" /> Salin
              </button>
            </div>
            <div className="text-gray-500 dark:text-gray-400">User wajib mengganti PIN saat login pertama.</div>
          </div>
        )}
      </div>
    </div>
  );
}
