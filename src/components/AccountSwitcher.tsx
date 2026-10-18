'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { UserCheck, Eye, ChevronDown, ShieldCheck, LogOut, KeyRound, UserRound } from 'lucide-react';
import { useAccess } from '@/context/AccessContext';
import { APP_BASE_PATH } from '@/lib/base-path';
import {
  listPreviewableUsersAction,
  logoutAction,
  startPreviewAction,
  stopPreviewAction,
  type PreviewableUser,
} from '@/app/actions/auth';

/** Menu akun di top bar: identitas user login, "Lihat sebagai" (khusus Admin), dan Keluar. */
function LoggedInUserMenu() {
  const access = useAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<PreviewableUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Daftar akun dimuat saat menu dibuka (Admin saja).
  useEffect(() => {
    if (!isOpen || !access.canPreview) return;
    let cancelled = false;
    listPreviewableUsersAction().then((res) => {
      if (cancelled) return;
      if (res.success) { setUsers(res.users); setLoadError(null); }
      else setLoadError(res.error || 'Gagal memuat daftar akun.');
    });
    return () => { cancelled = true; };
  }, [isOpen, access.canPreview]);

  const goHome = () => window.location.assign(`${APP_BASE_PATH}/`);

  const choose = async (userId: string | null) => {
    setBusy(true);
    if (userId) {
      const res = await startPreviewAction(userId);
      if (!res.success) {
        setBusy(false);
        setLoadError(res.error || 'Gagal mengganti tampilan.');
        return;
      }
    } else {
      await stopPreviewAction();
    }
    goHome();
  };

  const logout = async () => {
    setBusy(true);
    await logoutAction();
    window.location.assign(`${APP_BASE_PATH}/login`);
  };

  const name = access.userName || access.userCode || '';
  const previewing = access.preview;

  const badge = (text: string | null, selected: boolean) => (
    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold ${
      selected ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#272a34] text-gray-600 dark:text-gray-400'
    }`}>
      {text}
    </span>
  );
  // Penanda akun yang sedang aktif (tampilan saat ini); baris lain tidak menampilkan apa pun.
  const check = (selected: boolean) =>
    selected ? (
      <span className="inline-flex items-center gap-1 rounded-[4px] bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aktif
      </span>
    ) : null;
  const rowClass = (selected: boolean) =>
    `w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-sans transition-colors cursor-pointer disabled:opacity-60 ${
      selected
        ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] dark:hover:text-white'
    }`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[34px] px-2 sm:px-3 rounded-lg border bg-white dark:bg-[#16181d] text-xs font-sans font-medium text-gray-900 dark:text-gray-200 focus:outline-none transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none shrink-0 ${
          previewing ? 'border-[#ff5e1f]' : 'border-[#f0f0f0] dark:border-[#272a34] hover:border-gray-300 dark:hover:border-gray-700'
        }`}
        title={previewing ? 'Mode pratinjau (hanya-baca)' : 'Akun yang sedang login'}
      >
        {previewing ? <Eye className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" /> : <UserCheck className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />}
        <span className="hidden sm:inline max-w-[130px] truncate">{previewing ? previewing.name || 'Pratinjau' : name}</span>
        <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-100 dark:bg-[#272a34] text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300 shrink-0">
          {previewing ? previewing.userCode : access.userCode}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-gray-900 dark:text-white' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl z-50 font-sans text-xs">
          <div className="px-2.5 py-1.5 mb-1 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            <span>{access.canPreview ? 'LIHAT SEBAGAI' : 'AKUN SAYA'}</span>
            <ShieldCheck className="w-3 h-3 text-[#ff5e1f]" />
          </div>

          {access.canPreview ? (
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              <button type="button" disabled={busy} onClick={() => choose(null)} className={rowClass(!previewing)}>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate text-xs">{name} (saya)</span>
                  <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 truncate">
                    {access.roleLabels.join(', ') || 'Admin'} · tampilan penuh
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">{badge(access.userCode, !previewing)}{check(!previewing)}</div>
              </button>

              {users === null && !loadError && <div className="px-2.5 py-2 text-[11px] text-gray-400">Memuat akun…</div>}
              {loadError && <div className="px-2.5 py-2 text-[11px] text-rose-500">{loadError}</div>}
              {users?.length === 0 && <div className="px-2.5 py-2 text-[11px] text-gray-400">Belum ada akun lain. Buat lewat Account &amp; Team.</div>}
              {users?.map((u) => {
                const selected = previewing?.userCode === u.userCode;
                return (
                  <button key={u.id} type="button" disabled={busy} onClick={() => choose(u.id)} className={rowClass(selected)}>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-xs">{u.name || u.userCode}</span>
                      <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 truncate">
                        {u.roleLabels.join(', ') || 'Tanpa role'} · {u.unitNames.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">{badge(u.userCode, selected)}{check(selected)}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            (() => {
              const info = (
                <>
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-[#ff5e1f] transition-colors">{name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{access.userCode}</span>
                    <span>·</span>
                    <span>{access.roleLabels.join(', ') || 'Tanpa role'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Akses: {access.unitNames === null ? 'Semua production' : access.unitNames.join(', ') || '—'}
                  </div>
                </>
              );
              // Seluruh area 3 baris info menjadi satu tombol ke profil (bila akun punya profil).
              return access.hasProfile ? (
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  title="Buka profil"
                  className="group block px-2.5 py-2 space-y-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors"
                >
                  {info}
                </Link>
              ) : (
                <div className="px-2.5 py-2 space-y-1.5">{info}</div>
              );
            })()
          )}

          <div className="mt-1 pt-1 border-t border-[#f0f0f0] dark:border-[#272a34] space-y-0.5">
            {access.canPreview && !previewing && (
              <Link
                href="/user-role"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#ff5e1f] hover:bg-orange-500/10 transition-colors"
              >
                Kelola User &amp; Akses
              </Link>
            )}
            {access.hasProfile && previewing && (
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors"
              >
                <UserRound className="w-3 h-3" />
                <span>{previewing ? 'Profil akun ini' : 'Profil Saya'}</span>
              </Link>
            )}
            {!previewing && !access.hasProfile && (
              <Link
                href="/change-pin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                <span>Ganti PIN</span>
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountSwitcher() {
  const access = useAccess();
  if (access.enabled && access.userCode) return <LoggedInUserMenu />;
  return null;
}
